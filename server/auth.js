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
 * @param clientData
 * @return 400 + USER_DATA_IS_EMPTY
 * @return 200 + {clientId, clientSecret}
 */
router.post('/register_client', function (req, res) {
    if (!req.body.clientData) {
        res.status(400).end("USER_DATA_IS_EMPTY");
        return;
    }

    var clientId = utils.uid();
    var clientSecret = utils.token(16);
    db.clients.save(clientId, clientSecret, req.body.clientData);

    res.json({clientId: clientId, clientSecret: clientSecret});
});


/**
 * Регистрация пользователя
 * Требуется basic авторизация по clientId и clientSecret
 *
 * @param email, hashPassword, username, userData + req.user.clientId
 * @return 200 + {userId, accessToken, refreshToken, expiresIn}
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

    if (!req.body.username || !req.body.hashPassword) {
        res.status(400).end();
        return;
    }

    var userId = utils.uid();
    db.users.save(userId, req.body.email, req.body.username, req.body.hashPassword, req.body.userData, function (err) {
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
                    userId: userId,
                    accessToken: accessToken,
                    refreshToken: refreshToken,
                    expiresIn: expirationDate
                });

                process.nextTick(function () {
                    // TODO sendConfirmationEmail(req.body.email, req.body.language, req.protocol + '://' + req.get('host'));
                });
            });
        });
    });
});


/**
 * Вход пользователя по email
 * Требуется basic авторизация по clientId и clientSecret
 *
 * @param email, hashPassword
 * @return 200 + {userId, accessToken, refreshToken, expiresIn}
 * @return 400 + INVALID_EMAIL
 * @return 400 + WRONG_EMAIL_OR_PASSWORD
 * @return 500
 *
 */
router.post('/login', passport.authenticate('basic', {session: false}), function (req, res) {
    if (!utils.validateEmail(req.body.email)) {
        res.status(400).end("INVALID_EMAIL");
        return;
    }

    db.users.findByEmail(req.body.email, function (err, user) {
        if (err && err.code === "EMAIL_NOT_FOUND") {
            res.status(400).end("WRONG_EMAIL_OR_PASSWORD");
            return;
        }

        if (err) {
            res.status(500).end();
            return;
        }

        var accessToken = utils.token();
        var expirationDate = utils.calculateExpirationDate();
        db.accessTokens.save(accessToken, expirationDate, user.id, req.user.clientId, function (err) {
            if (err) {
                res.status(500).end();
                return;
            }

            var refreshToken = utils.token();
            db.refreshTokens.save(refreshToken, user.id, req.user.clientId, function (err) {
                if (err) {
                    res.status(500).end();
                    return;
                }

                res.json({
                    userId: user.id,
                    accessToken: accessToken,
                    refreshToken: refreshToken,
                    expiresIn: expirationDate
                });
            });
        });
    });
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