//Bare bones server intialization.

const port = process.env.PORT || 3000;
const express = require('express')
const path = require('path')
const bodyParser = require('body-parser');

const router = require('./server/router.js');


//cookie monster's code repos!
var flash = require('connect-flash');
var cookieParser = require('cookie-parser')
var session = require('express-session')
//Require if modular code is put in helper:
//var helper = require('./helpers/helper');

const app = express()

const db = require('./db')

//enabling various cookie /session /flash functionality! <('.')>
app.use(cookieParser());
app.use(session({secret: 'recursive raccoon', resave: true, saveUninitialized: false}));


//passport authentication

app.use(flash());



// Middleware to parse body:
app.use(bodyParser.json());

//Paths to look for files to import (can have many):
app.use(express.static(path.resolve(__dirname, './node_modules')))

app.use(express.static(path.resolve(__dirname, './home')))



//Passport facebook strategy config:

app.use('/', router);




//Server init to listen on port 3000 -> Needs to be altered for deployment
app.listen(port);
console.log('Greenfield server running on :3000');
//here is a change.
