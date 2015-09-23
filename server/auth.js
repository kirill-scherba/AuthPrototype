var express = require('express');
var passport = require('passport');
var utils = require('./utils');
var db = require('./db');

var router = express.Router();

router.get('/', function (req, res) {
    res.send('auth');
});


/**
 * Регистрация клиента (приложение, браузер и т.д. -user-agent)
 * @param client_data
 * @return 400 + USER_DATA_IS_EMPTY
 * @return 200 + {client_id, client_secret}
 */
router.post('/register_client', function (req, res) {
    if (!req.body.client_data) {
        res.status(400).end("USER_DATA_IS_EMPTY");
        return;
    }

    var clientId = utils.uid();
    var clientSecret = utils.token(16);
    db.clients.save(clientId, clientSecret, req.body.client_data);

    res.json({client_id: clientId, client_secret: clientSecret});
});


/**
 * Регистрация пользователя
 * Требуется basic авторизация по client_id и client_secret
 *
 * @param email, hash_password, username, user_data + req.user.clientId
 * @return 200 + {user_id, access_token, refresh_token, expires_in}
 * @return 400
 * @return 400 + INVALID_EMAIL
 * @return 400 + EMAIL_EXISTS
 * @return 500
 */
router.post('/register', passport.authenticate('basic', {session: false}), function (req, res) {
    if (!utils.validateEmail(req.body.email)) {
        res.status(400).end("INVALID_EMAIL");
        return;
    }

    if (!req.body.username || !req.body.hash_password) {
        res.status(400).end();
        return;
    }

    var userId = utils.uid();
    db.users.save(userId, req.body.email, req.body.username, req.body.hash_password, req.body.user_data, function (err) {
        if (err && err.code === "EMAIL_EXISTS") {
            res.status(400).end("EMAIL_EXISTS");
            return;
        }

        var accessToken = utils.token();
        var expirationDate = utils.calculateExpirationDate();
        db.accessTokens.save(accessToken, expirationDate, userId, req.user.clientId, function (err) {
            if (err) {
                res.status(500).end();
                db.users.delete(userId);
                return;
            }

            var refreshToken = utils.token();
            db.refreshTokens.save(refreshToken, userId, req.user.clientId, function (err) {
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