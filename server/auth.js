var express = require('express');
var utils = require('./utils');
var db = require('./db');

var router = express.Router();

router.get('/', function (req, res) {
    res.send('auth');
});


router.post('/register_client', function (req, res) {
    if (!req.body.user_data) {
        res.status(400).end("USER_DATA_IS_EMPTY");
        return;
    }

    var clientId = utils.uid();
    var clientSecret = utils.token();
    db.clients.save(clientId, clientSecret, req.body.user_data);

    res.json({client_id: clientId, client_secret: clientSecret});
});


router.post('/register', function (req, res) { // TODO BasicStrategy
    if (!utils.validateEmail(req.body.email)) {
        res.status(400).end("INVALID_EMAIL");
        return;
    }

    if (!req.body.username) {
        res.status(400).end("USERNAME_IS_EMPTY");
        return;
    }

    var userId = utils.uid();
    db.users.save(userId, req.body.email, req.body.username, req.body.hashpassword, {language: req.body.language}, function (err) {
        if (err && err.code === "EMAIL_EXISTS") {
            res.status(400).end("EMAIL_EXISTS");
            return;
        }


        var accessToken = utils.token();
        var expirationDate = utils.calculateExpirationDate();
        db.accessTokens.save(accessToken, expirationDate, userId, req.body.clientId, function (err) {
            if (err) {
                res.status(500).end();
                db.users.delete(userId);
                return;
            }

            var refreshToken = utils.token();
            db.refreshTokens.save(refreshToken, userId, req.body.clientId, function (err) {
                if (err) {
                    res.status(500).end();
                    db.users.delete(userId);
                    return;
                }

                res.json({
                    user_id: userId,
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    expires_in: expirationDate
                });

                process.nextTick(function () {
                    // TODO sendConfirmationEmail(req.body.email, req.body.language, req.protocol + '://' + req.get('host'));
                });
            });
        });
    });
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