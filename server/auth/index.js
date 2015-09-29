var express = require('express');
var passport = require('passport');
var base32 = require('thirty-two');
var utils = require('./../utils');
var db = require('./../db/index');
var config = require('./../config');

var router = express.Router();
router.use('/facebook', require('./facebook'));

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
        if (err && err.message === "EMAIL_EXISTS") {
            res.status(400).end("EMAIL_EXISTS");
            return;
        }

        if (err) {
            console.log(JSON.stringify(err));
            res.status(500).end();
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
 * @return 400 + HASHPASSWORD_IS_EMPTY
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

    if (!req.body.hashPassword) {
        res.status(400).end("HASHPASSWORD_IS_EMPTY");
        return;
    }

    db.users.findByEmail(req.body.email, function (err, user) {
        if (err && err.message === "EMAIL_NOT_FOUND" || !user || user.hashPassword !== req.body.hashPassword) {
            res.status(400).end("WRONG_EMAIL_OR_PASSWORD");
            return;
        }

        if (err) {
            res.status(500).end();
            return;
        }


        if (user.twoFactor) {
            var temporaryToken = utils.token();
            var temporaryExpirationDate = utils.calculateExpirationDate(config.temporaryTokenExpiresIn);
            db.temporaryTokens.save(temporaryToken, temporaryExpirationDate, user.id, req.user.clientId, function (err) {
                if (err) {
                    res.status(500).end();
                    return;
                }

                res.json({
                    userId: user.id,
                    temporaryToken: temporaryToken,
                    expiresIn: temporaryExpirationDate
                });

                // удаляем для этого клиента старые токены
                process.nextTick(function () {
                    db.temporaryTokens.deleteByClientIdExceptNewToken(req.user.clientId, temporaryToken);
                });
            });
        } else {
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

                    // удаляем для этого клиента старые токены
                    process.nextTick(function () {
                        db.accessTokens.deleteByClientIdExceptNewToken(req.user.clientId, accessToken);
                        db.refreshTokens.deleteByClientIdExceptNewToken(req.user.clientId, refreshToken);
                    });
                });
            });
        }
    });
});


/**
 * Замена токена по refreshToken
 *
 * @param refreshToken
 * @return 400
 * @return 401
 * @return 500
 */
router.post('/refresh', passport.authenticate('basic', {session: false}), function (req, res) {
    if (!req.body.refreshToken) {
        res.status(400).end();
        return;
    }

    db.refreshTokens.find(req.body.refreshToken, function (err, oldRefreshTokenRecord) {
        if (err) {
            res.status(500).end();
            return;
        }

        if (!oldRefreshTokenRecord || oldRefreshTokenRecord.clientId !== req.user.clientId) {
            res.status(401).end();
            return;
        }

        var accessToken = utils.token();
        var expirationDate = utils.calculateExpirationDate();
        db.accessTokens.save(accessToken, expirationDate, oldRefreshTokenRecord.userId, req.user.clientId, function (err) {
            if (err) {
                res.status(500).end();
                return;
            }

            var refreshToken = utils.token();
            db.refreshTokens.save(refreshToken, oldRefreshTokenRecord.userId, req.user.clientId, function (err) {
                if (err) {
                    res.status(500).end();
                    return;
                }

                res.json({
                    userId: oldRefreshTokenRecord.userId,
                    accessToken: accessToken,
                    refreshToken: refreshToken,
                    expiresIn: expirationDate
                });

                // удаляем для этого клиента старые токены
                process.nextTick(function () {
                    db.accessTokens.deleteByClientIdExceptNewToken(req.user.clientId, accessToken);
                    db.refreshTokens.deleteByClientIdExceptNewToken(req.user.clientId, refreshToken);
                });
            });
        });
    });
});


router.get('/me', passport.authenticate('bearer', {session: false}), function (req, res) {
    res.json(req.user);
});


router.get('/logout', passport.authenticate('bearer', {session: false}), function (req, res) {
    db.accessTokens.deleteByClientId(req.user.clientId);
    db.refreshTokens.deleteByClientId(req.user.clientId);

    res.status(200).end();
});


/**
 * Установить двухфакторную авторизацию
 *
 * bearer стратегия отдает побъект пользователя
 */
router.get('/setup-two-factor', passport.authenticate('bearer', {session: false}), function (req, res) {
    var encodedKey;
    var otpUrl;
    var qrImage;

    if (req.user.twoFactor) {
        // two-factor auth has already been setup
        encodedKey = base32.encode(req.user.twoFactor.key);

        // generate QR code for scanning into Google Authenticator
        // reference: https://code.google.com/p/google-authenticator/wiki/KeyUriFormat
        otpUrl = 'otpauth://totp/' + req.user.email + '?secret=' + encodedKey + '&period=' + req.user.twoFactor.period;
        qrImage = 'https://chart.googleapis.com/chart?chs=166x166&chld=L|0&cht=qr&chl=' + encodeURIComponent(otpUrl);

        res.json({user: req.user.id, key: encodedKey.toString(), qrImage: qrImage});
    } else {
        // new two-factor setup.  generate and save a secret key
        var key = utils.token(10);
        encodedKey = base32.encode(key);

        var period = config.twoFactorPeriod;

        // generate QR code for scanning into Google Authenticator
        // reference: https://code.google.com/p/google-authenticator/wiki/KeyUriFormat
        otpUrl = 'otpauth://totp/' + req.user.email + '?secret=' + encodedKey + '&period=' + period;
        qrImage = 'https://chart.googleapis.com/chart?chs=166x166&chld=L|0&cht=qr&chl=' + encodeURIComponent(otpUrl);

        db.users.setTwoFactor(req.user.id, {key: key, period: period}, function (err) {
            if (err) {
                res.status(500).end();
                return;
            }

            res.json({user: req.user.id, key: encodedKey.toString(), qrImage: qrImage});
        });
    }
});


router.post('/login-otp',
    passport.authenticate('temporary-bearer', {session: false}), // получает юзера и пробрасывает в totp стратегию
    passport.authenticate('totp', {session: false}),
    function (req, res) {
        res.send('auth');
        // TODO выдача токенов
    });

/**
 * TODO 1) social   2) 2fa   3) БД   4) шифрование/логирование/рефакторинг  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * TODO вспомогательные урлы
 *
 /change_password
 /resend_email
 /verify
 /restore

 */

module.exports = router;