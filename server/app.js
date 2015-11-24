var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.raw());



//CORS middleware
var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
};
app.use(allowCrossDomain);

require('./auth/strategies');
require('./auth/facebook/strategy');

app.use(passport.initialize());


app.get('/', function (req, res) {
    res.send('Hello World!');
});

app.get('/api', function (req, res) {
    res.send('API is running');
});

app.use('/api/auth', require('./auth/index'));


module.exports = app;