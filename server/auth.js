var express = require('express');
var utils = require('./utils');
var db = require('./db');

var router = express.Router();

router.get('/', function (req, res) {
    res.send('auth');
});


router.post('/register_client', function (req, res) {
    var clientId = utils.uid();
    var clientSecret = utils.token();
    db.clients.save(clientId, clientSecret, req.body.user_data);

    res.json({id: clientId, secret: clientSecret});
});

router.post('/register', function (req, res) {
    res.send('auth');
});


router.post('/login', function (req, res) {
    res.send('auth');
});

router.post('/refresh', function (req, res) {
    res.send('auth');
});


/**
 * TODO вспомогательные урлы
 *
/change_password
/resend_email
 /verify
 /restore
 router.post('/login-otp', function (req, res) {
    res.send('auth');
 });
*/

module.exports = router;