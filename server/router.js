var app = require('../index.js');
var router = require('express').Router();
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const config = require('../config/config.js')
//Require all created models:

var Message = require('../models/message');
var User = require('../models/user');
var Event = require('../models/event');

//Get and post methods should be delegated to routes.js file to simplify and modularize
// Redirect the user to Facebook for authentication.  When complete,
// Facebook will redirect the user back to the application at
//     /auth/facebook/callback || index

router.get('/auth/facebook', passport.authenticate('facebook', { scope : ['email'] }));

router.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/' }),
  function(req, res) {
    res.redirect('/');
  });

passport.use(new FacebookStrategy({
    clientID: config.FACEBOOK_APP_ID, 
    clientSecret:  config.FACEBOOK_APP_SECRET, 
    callbackURL: "http://localhost:3000/auth/facebook/callback",
    profileFields: ['id', 'displayName', 'photos', 'emails']
  },
  function(accessToken, refreshToken, profile, done) {
    console.log('this is the facebook returned profile', profile)
    User.findOne({
      'facebook.id':profile.id
    }, function(err, user) {
      if (err) {
        console.error(err)
        return done(err)
      }
      if (!user) {
        console.log("new user created");
        user = new User({
          user: profile.displayName,
          picture: profile.photos[0].value,
          email: profile.emails[0].value,
          facebook: profile._json,
          description: ""
        });
        user.save(function(err) {
          if (err) console.error(err);
          return done(null, user)
        })
      } else {
        console.log('user found')
        return done(null, user);
      }
    })
  }
))    

// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  In a
// production-quality application, this would typically be as simple as
// supplying the user ID when serializing, and querying the user record by ID
// from the database when deserializing.  However, due to the fact that this
// example does not have a database, the complete Facebook profile is serialized
// and deserialized.
passport.serializeUser(function(user, done) {
  console.log("serialize user: ", user.user);
  done(null, user.facebook.id);
});

passport.deserializeUser(function(id, done) {
  User.findOne({'facebook.id':id}, function(err, user) {
    done(err, user);
  });
});

router.use(passport.initialize());
router.use(passport.session());


router.get('/account', function(req, res){
   if (req.isAuthenticated()) { 
     res.send({user : req.user}); 
   }else{
     res.sendStatus(404);
   }
 });

router.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

router.get('/error', function(req, res) {
  res.sendStatus(404);
})

router.get('/timer/:id', function(req, res) {
  var id = req.param.id;
  ObjectId(id).getTimestamp().exec(function(err, data) { //Event.findOne({id: id})
    res.json(200, data);
  });
})

//Get and post methods for messages on event page

router.post('/message', function(req, res){
  var newMessage = new Message ({
    user: req.user.user,
    event: req.body.event,
    text: req.body.text
  });
  newMessage.save(function(err, newMessage){
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(200).send(newMessage);
    }
  });
});

router.get('/message/:eventId', function(req, res){
  Message.find({event: req.param("eventId")}, function(err, newMessages){
    if(err){
      res.status(500).send(err);
    } else {
      res.status(200).send(newMessages);
    }
  });
});

//Get and post methods for events on app/home page

router.post('/events', function(req, res){
  var newEvent = new Event ({
    name: req.body.name,
    description: req.body.description,
    host: {user: req.user.user, photo: req.user.picture, email: req.user.email, description: req.user.description},
    type: req.body.type,
    time: req.body.time,
    price: req.body.price || 0,
    desiredParticipants: req.body.desiredParticipants,
    location: {address: req.body.location, lng: 0, lat: 0}
  });
  newEvent.save(function(err, newEvent){
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(200).send(newEvent);
    }
  });
});

router.put('/confirmParticipant', function(req, res){
  User.findOne({user: req.body.participantName}, function(err, joiner){
    if(err){
      res.status(500).send(err);
    } else {
      console.log("A")
      var joinerObj = {$push: {confirmedParticipants: {user: joiner.user, photo: joiner.picture, email: joiner.email}},
        $pull: {potentialParticipants: {user: joiner.user}}};
      console.log(req.body);
      Event.update({_id: req.body.eventId}, joinerObj, function(err, updatedEvent){
        if (err) {
          res.status(500).send(err);
        } else {
          res.status(200).send(updatedEvent);
        }
      })
    }
  });
});

router.put('/events', function(req, res){
  User.findOne({_id: req.user._id}, function(err, joiner){
    if(err){
      res.status(500).send(err);
    } else {
      var joinerObj = {$push: {potentialParticipants: {user: joiner.user, photo: joiner.picture, email: joiner.email}}};
      console.log(req.body);
      Event.update({_id: req.body.eventData}, joinerObj, function(err, updatedEvent){
        if (err) {
          res.status(500).send(err);
        } else {
          res.status(200).send(updatedEvent);
        }
      })
    }
  });
});

router.put('/events/:id', function(req, res){
    // Geting the event to update
  Event.findOne({_id: req.param("id")}, function(err, newEvent){
    // Updating all the information from the event
    // **********************************************************************
    if(req.body.name){
        newEvent.name = req.body.name;   
    }
    if(req.body.description){
        newEvent.description = req.body.description;
    }
    
    if(req.user){
        newEvent.host = req.user.user;
    }
    
    if(req.body.type){
        newEvent.type = req.body.type;
    }
    
    if(req.body.time){
        newEvent.time = req.body.time;
    }
    if(req.body.price){
        newEvent.price = req.body.price || 0;
    }
    if(req.body.desiredParticipants){
        newEvent.desiredParticipants = req.body.desiredParticipants;
    }
    
    if(req.body.location){
        newEvent.location = {
            address: req.body.location,
            lng: 0, 
            lat: 0
        }
    }
    // **********************************************************************
    
    // Saving the changed fields
    newEvent.save(function(err, updatedEvent){
        res.send(updatedEvent);
    });
  });
});

router.get('/events', function(req, res){
  Event.find({}, function(err, events) {
    if(err){
      res.status(500).send(err);
    } else {
      res.status(200).send(events);
    }
  });
});


router.get('/events/:id', function(req, res){
  Event.findOne({_id: req.param("id")}, function(err, newEvent){
    if(err){
      res.send({
        error: err
      });
    } else {
      res.send(newEvent);
    }
  });
});

router.put('/user/:id', function(req, res){ //email: email, number:number, description: description
    // Geting the event to update
  User.findOne({"facebook.id": req.param("id")}, function(err, newUser){
    console.log("newUser on line 278 is ", newUser);
    // Updating all the information from the event
    // **********************************************************************
    newUser.email = req.body.email;
    newUser.number = req.body.number;
    newUser.description = req.body.description;
    // **********************************************************************
    
    // Saving the changed fields
    newUser.save(function(err, updatedUser){
      if (err) console.error(err);
      res.send(updatedUser);
    });
  });
});

module.exports = router;
