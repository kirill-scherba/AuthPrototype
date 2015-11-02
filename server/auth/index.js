var express = require('express');
var passport = require('passport');
var base32 = require('thirty-two');
var db = require('./../db/index');
var utils = require('./../libs/utils');
var config = require('./../libs/config');
var log = require('./../libs/log');
var decryptBody = require('./../libs/decryptBody');

var cipher = utils.Cipher();

var router = express.Router();
router.use('/facebook', require('./facebook'));
router.use('/social', require('./social'));


router.get('/', function (req, res) {
    res.send('auth');
});


/**
 * Регистрация клиента (приложение, браузер и т.д. -user-agent)
 * @param clientData
 * @return 400 + USER_DATA_IS_EMPTY
 * @return 200 + {clientId, clientSecret}
 */
router.post('/register-client', function (req, res) {
    if (Object.keys(req.body).length === 0) { // проверяем, что тело не пустое
        res.status(400).end("USER_DATA_IS_EMPTY");
        return;
    }

    var clientId = utils.uid();
    var clientSecret = utils.token(16);
    db.clients.save(clientId, clientSecret, req.body);

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
router.post('/register',
    passport.authenticate('basic', {session: false}),
    decryptBody,
    function (req, res) {
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
                log.error(err);
                res.status(500).end();
                return;
            }

            var accessToken = utils.token();
            var expirationDate = utils.calculateExpirationDate();
            db.accessTokens.save(accessToken, expirationDate, userId, req.user.clientId, function (err) {
                if (err) {
                    log.error(err);
                    res.status(500).end();
                    db.users.delete(userId);
                    return;
                }

                var refreshToken = utils.token();
                db.refreshTokens.save(refreshToken, userId, req.user.clientId, function (err) {
                    if (err) {
                        log.error(err);
                        res.status(500).end();
                        db.users.delete(userId);
                        return;
                    }

                    res.json(cipher.encryptJSON({
                        userId: userId,
                        accessToken: accessToken,
                        refreshToken: refreshToken,
                        expiresIn: expirationDate,

                        email: req.body.email,
                        username: req.body.username,
                        userData: req.body.userData
                    }, req.user.clientSecret));

                    process.nextTick(function () {
                        var token = utils.emailToken(req.body.email + req.body.username);
                        db.emailValidation.save(req.body.email, token);

                        // TODO sendConfirmationEmail(req.body.email, req.body.language, req.protocol + '://' + req.get('host'));
                    });
                });
            });
        });
    });


function generateAuthTokens(userId, clientId, done) {
    var accessToken = utils.token();
    var expirationDate = utils.calculateExpirationDate();
    db.accessTokens.save(accessToken, expirationDate, userId, clientId, function (err) {
        if (err) {
            log.error(err);
            done(err);
            return;
        }

        var refreshToken = utils.token();
        db.refreshTokens.save(refreshToken, userId, clientId, function (err) {
            if (err) {
                log.error(err);
                done(err);
                return;
            }

            done(null, {
                accessToken: accessToken,
                refreshToken: refreshToken,
                expiresIn: expirationDate
            });

            // удаляем для этого клиента старые токены
            process.nextTick(function () {
                db.accessTokens.deleteByClientIdExceptNewToken(clientId, accessToken);
                db.refreshTokens.deleteByClientIdExceptNewToken(clientId, refreshToken);
            });
        });
    });
}


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
router.post('/login',
    passport.authenticate('basic', {session: false}),
    decryptBody,
    function (req, res) {
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
                log.error(err);
                res.status(500).end();
                return;
            }


            if (user.twoFactor) {
                var temporaryToken = utils.token();
                var temporaryExpirationDate = utils.calculateExpirationDate(config.get('temporaryTokenExpiresIn'));
                db.temporaryTokens.save(temporaryToken, temporaryExpirationDate, user.userId, req.user.clientId, function (err) {
                    if (err) {
                        log.error(err);
                        res.status(500).end();
                        return;
                    }

                    res.json(cipher.encryptJSON({
                        temporaryToken: temporaryToken,
                        expiresIn: temporaryExpirationDate
                    }, req.user.clientSecret));

                    // удаляем для этого клиента старые токены
                    process.nextTick(function () {
                        db.temporaryTokens.deleteByClientIdExceptNewToken(req.user.clientId, temporaryToken);
                    });
                });
            } else {
                generateAuthTokens(user.userId, req.user.clientId, function (err, data) {
                    if (err) {
                        log.error(err);
                        res.status(500).end();
                        return;
                    }

                    res.json(cipher.encryptJSON({
                        userId: user.userId,
                        accessToken: data.accessToken,
                        refreshToken: data.refreshToken,
                        expiresIn: data.expiresIn,

                        email: user.email,
                        username: user.username,
                        userData: user.data
                    }, req.user.clientSecret));
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
router.post('/refresh',
    passport.authenticate('basic', {session: false}),
    function (req, res) {
        if (!req.body.refreshToken) {
            res.status(400).end();
            return;
        }

        db.refreshTokens.find(req.body.refreshToken, function (err, oldRefreshTokenRecord) {
            if (err) {
                log.error(err);
                res.status(500).end();
                return;
            }

            if (!oldRefreshTokenRecord || oldRefreshTokenRecord.clientId !== req.user.clientId) {
                res.status(401).end();
                return;
            }


            generateAuthTokens(oldRefreshTokenRecord.userId, oldRefreshTokenRecord.clientId, function (err, data) {
                if (err) {
                    log.error(err);
                    res.status(500).end();
                    return;
                }

                res.json(cipher.encryptJSON({
                    accessToken: data.accessToken,
                    refreshToken: data.refreshToken,
                    expiresIn: data.expiresIn
                }, req.user.clientSecret));
            });
        });
    });


router.get('/me', passport.authenticate('bearer', {session: false}), function (req, res) {
    res.json({
        clientId: req.user.clientId,
        userId: req.user.userId
    });
});


router.post('/logout', passport.authenticate('bearer', {session: false}), function (req, res) {
    db.accessTokens.deleteByClientId(req.user.clientId);
    db.refreshTokens.deleteByClientId(req.user.clientId);

    res.status(200).end();
});


/**
 * Установить двухфакторную авторизацию
 *
 * bearer стратегия отдает побъект пользователя
 */
router.post('/setup-two-factor', passport.authenticate('bearer', {session: false}), function (req, res) {
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

        res.json(cipher.encryptJSON({
            twoFactor: {
                key: encodedKey.toString(),
                qrImage: qrImage,
                otpUrl: otpUrl
            }
        }, req.user.clientSecret));
    } else {
        // new two-factor setup.  generate and save a secret key
        var key = utils.token(10);
        encodedKey = base32.encode(key);


        /**
         * RFC 6238
         * We RECOMMEND a default time-step size of 30 seconds.  This default
         * value of 30 seconds is selected as a balance between security and
         * usability.
         *
         * Google Authenticator: support for 30-second TOTP codes
         */
        var period = config.get('twoFactorPeriod');

        // generate QR code for scanning into Google Authenticator
        // reference: https://code.google.com/p/google-authenticator/wiki/KeyUriFormat
        otpUrl = 'otpauth://totp/' + req.user.email + '?secret=' + encodedKey + '&period=' + period;
        qrImage = 'https://chart.googleapis.com/chart?chs=166x166&chld=L|0&cht=qr&chl=' + encodeURIComponent(otpUrl);

        db.users.setTwoFactor(req.user.userId, {key: key, period: period}, function (err) {
            if (err) {
                log.error(err);
                res.status(500).end();
                return;
            }

            res.json(cipher.encryptJSON({
                twoFactor: {
                    key: encodedKey.toString(),
                    qrImage: qrImage,
                    otpUrl: otpUrl
                }
            }, req.user.clientSecret));
        });
    }
});


/**
 * Отключить двухфакторную авторизацию
 *
 * @param hashPassword
 * @return 200
 * @return 400 + WRONG_PASSWORD
 * @return 500
 */
router.post('/disable-two-factor',
    passport.authenticate('bearer', {session: false}),
    decryptBody,
    function (req, res) {
        db.users.find(req.user.userId, function (err, user) {
            if (err) {
                log.error(err);
                res.status(500).end();
                return;
            }

            if (user.hashPassword !== req.body.hashPassword) {
                res.status(400).end("WRONG_PASSWORD"); // не верный пароль
                return;
            }

            if (!req.user.twoFactor) {
                res.status(200).end();
                return;
            }

            db.users.disableTwoFactor(req.user.userId, function (err) {
                if (err) {
                    log.error(err);
                    res.status(500).end();
                    return;
                }

                res.status(200).end();
            });
        });
    });


router.post('/login-otp',
    passport.authenticate('temporary-bearer', {session: false}), // получает юзера и пробрасывает в totp стратегию
    passport.authenticate('totp', {session: false}),
    function (req, res) {
        generateAuthTokens(req.user.userId, req.user.clientId, function (err, data) {
            if (err) {
                log.error(err);
                res.status(500).end();
                return;
            }

            res.json(cipher.encryptJSON({
                userId: req.user.userId,
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
                expiresIn: data.expiresIn,
                email: req.user.email,
                username: req.user.username,
                userData: req.user.data
            }, req.user.clientSecret));
        });
    });


/**
 * Изменить пароль
 * @param current, new
 * @return 200
 * @return 400 + WRONG_PASSWORD
 * @return 500
 */
router.post('/change-password',
    passport.authenticate('bearer', {session: false}),
    decryptBody,
    function (req, res) {
        db.users.find(req.user.userId, function (err, user) {
            if (err) {
                log.error(err);
                res.status(500).end();
                return;
            }

            if (user.hashPassword !== req.body.current) {
                res.status(400).end("WRONG_PASSWORD"); // не верный пароль
                return;
            }

            db.users.setPassword(req.user.userId, req.body.new, function (err) {
                if (err) {
                    log.error(err);
                    res.status(500).end();
                    return;
                }

                res.status(200).end();
            });
        });
    });


/**
 * Восстановление пароля по email
 * @param email
 * @return 200 - сообщение отправлено или email не найден
 * @return 400 + email нет в запросе
 * @return 500
 */
router.post('/restore',
    passport.authenticate('basic', {session: false}),
    decryptBody, // чтобы закрыть email пользователя
    function (req, res) {
        if (!req.body.email) {
            res.status(400).end();
            return;
        }

        db.users.findByEmail(req.body.email, function (err, user) {
            if (err && err.message === "EMAIL_NOT_FOUND" || !user) {
                res.status(200).end(); // не показываем, что такого e-mail нет
                return;
            }

            if (err) {
                log.error(err);
                res.status(500).end();
                return;
            }

            res.status(200).end();
            process.nextTick(function () {
                var token = utils.emailToken(req.body.email + user.username);
                db.emailRestore.save(req.body.email, token);

                // TODO sendRestoreEmail(req.body.email, token, user, req.protocol + '://' + req.get('host'));
            });
        });
    });


router.post('/resend-email',
    passport.authenticate('bearer', {session: false}),
    function (req, res) {
        res.status(200).end();

        process.nextTick(function () {
            var token = utils.emailToken(req.user.email + req.user.username);
            db.emailValidation.save(req.user.email, token);

            // TODO sendConfirmationEmail(req.user.email, req.user.language, req.protocol + '://' + req.get('host'));
        });
    });

/**
 * TODO вспомогательные урлы
 *
 /verify
 /change-pwd - станица на которую человек попадет для восстановления пароля
 */

module.exports = router;