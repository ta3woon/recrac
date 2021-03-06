var mongoose = require('mongoose');

var eventSchema = new mongoose.Schema({
  name: String,
  description: String,
  host: String,
  type: String,
  //Set up geolocation data
  location: Number,


  time: String,
  price: Number,
  confirmedParticipants: String,
  potentialParticipants: String
});

module.exports = mongoose.model('Event', eventSchema);

