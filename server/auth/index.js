var express = require('express');
var passport = require('passport');
var base32 = require('thirty-two');
var db = require('./../db/index');
var utils = require('./../libs/utils');
var config = require('./../libs/config');
var log = require('./../libs/log');
var decryptBody = require('./../middleware/decryptBody');
var helper = require('./helper');
var mail = require('./../libs/mail');

var cipher = utils.Cipher();

var router = express.Router();
router.use('/facebook', require('./facebook'));
router.use('/social', require('./social'));


function sendConfirmationEmail(email, username, main_url) {
    var token = utils.emailToken(email + username);
    db.emailValidation.save(email, token, function (err) {
        if (err) {
            log.error(err);
            return;
        }

        //send email with url
        var _url = main_url + "/api/auth/verify/" + token;

        mail.sendConfirmation({
            email: email,
            username: username,
            url: _url
        });
    });
}


function sendRestoreEmail(email, username, main_url) {
    var token = utils.emailToken(email + username);
    db.emailRestore.save(email, token, function (err) {
        if (err) {
            log.error(err);
            return;
        }

        //send email with url
        var _url = main_url + "/change-pwd/" + token;

        mail.sendRestore({
            email: email,
            username: username,
            url: _url
        });
    });
}


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
    var clientKey = utils.token(16);
    db.clients.save(clientId, clientSecret, clientKey, req.body);

    res.json({
        clientId: clientId,
        clientSecret: clientSecret,
        clientKey: clientKey
    });
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
        db.users.save(userId, req.body.email, req.body.username, req.body.hashPassword, req.body.userData, function (err, user) {
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
            var expiresIn = utils.calculateExpirationDate();
            db.accessTokens.save(accessToken, expiresIn, userId, req.user.clientId, function (err) {
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

                    res.json(cipher.encryptJSON(
                        helper.getUserData(accessToken, refreshToken, expiresIn, user),
                        req.user.clientKey));

                    process.nextTick(function () {
                        sendConfirmationEmail(req.body.email, req.body.username, req.protocol + '://' + req.get('host'));
                    });
                });
            });
        });
    });


function generateAuthTokens(userId, clientId, done) {
    var accessToken = utils.token();
    var expiresIn = utils.calculateExpirationDate();
    db.accessTokens.save(accessToken, expiresIn, userId, clientId, function (err) {
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
                expiresIn: expiresIn
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
                var temporaryExpiresIn = utils.calculateExpirationDate(config.get('temporaryTokenExpiresIn'));
                db.temporaryTokens.save(temporaryToken, temporaryExpiresIn, user.userId, req.user.clientId, function (err) {
                    if (err) {
                        log.error(err);
                        res.status(500).end();
                        return;
                    }

                    res.json(cipher.encryptJSON({
                        temporaryToken: temporaryToken,
                        expiresIn: temporaryExpiresIn
                    }, req.user.clientKey));

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

                    res.json(cipher.encryptJSON(
                        helper.getUserData(data.accessToken, data.refreshToken, data.expiresIn, user),
                        req.user.clientKey));
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
                }, req.user.clientKey));
            });
        });
    });


/**
 * @return user data for users with trusted ip and clientId and userId for other users
 */
router.get('/me', passport.authenticate('bearer', {session: false}), function (req, res) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (config.get('trustedIp').indexOf(ip) !== -1) {
        res.json({
            clientId: req.user.clientId,
            clientData: req.user.clientData,
            userId: req.user.userId,
            email: req.user.email,
            username: req.user.username,
            groups: req.user.groups
        });
    } else {
        res.json({
            clientId: req.user.clientId,
            userId: req.user.userId
        });
    }
});


/**
 * Validate client
 *
 * @return 200
 * @return 401
 */
router.get('/validate-client',
    passport.authenticate('basic', {session: false}),
    function (req, res) {
        res.status(200).end();
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
        }, req.user.clientKey));
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
            }, req.user.clientKey));
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

            res.json(cipher.encryptJSON(
                helper.getUserData(data.accessToken, data.refreshToken, data.expiresIn, req.user),
                req.user.clientKey));
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
                sendRestoreEmail(req.body.email, req.body.username, req.protocol + '://' + req.get('host'));
            });
        });
    });


router.post('/resend-email',
    passport.authenticate('bearer', {session: false}),
    function (req, res) {
        res.status(200).end();

        process.nextTick(function () {
            sendConfirmationEmail(req.user.email, req.user.username, req.protocol + '://' + req.get('host'));
        });
    });


router.post('/deactivate',
    passport.authenticate('bearer', {session: false}),
    function (req, res) {
        db.accessTokens.deleteByClientId(req.user.clientId);
        db.refreshTokens.deleteByClientId(req.user.clientId);

        db.users.deactivate(req.user.userId, function (err) {
            if (err) {
                log.error(err);
                res.status(500).end();
                return;
            }

            res.status(200).end();
        });
    });


/**
 * Confirm e-mail address, add 'confirmed_email' group for user
 */
router.get('/verify/:token', function (req, res) {
    db.emailValidation.find(req.params.token, function (err, result) {
        if (err) {
            log.error(err);
            res.status(200).end(config.get('verificationEmail:textForBrowser:error'));
            return;
        }

        if (!result) {
            res.status(200).end(config.get('verificationEmail:textForBrowser:error'));
            return;
        }

        if (new Date() > new Date(result.dtCreate.getTime() + config.get('verifyTokenExpiresIn') * 1000)) {
            res.status(200).end(config.get('verificationEmail:textForBrowser:expired')); //expired
            return;
        }

        db.users.setGroupByEmail(result.email, 'confirmed_email', function (err) {
            if (err) {
                log.error(err);
                res.status(200).end(config.get('verificationEmail:textForBrowser:error'));
                return;
            }

            res.status(200).end(config.get('verificationEmail:textForBrowser:success'));
        });
    });
});


/**
 * TODO вспомогательные урлы
 * /change-pwd - станица на которую человек попадет для восстановления пароля
 */

module.exports = router;