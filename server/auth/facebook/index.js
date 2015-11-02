/**
 * сперва юзер авторизуется через fb анонимно для сервера
 * генерируется токен, записывается в бд и отдается пользователю
 * потом пользователь с токеном проходит по нужному урлу
 *  /signin
 *  /link
 *  /unlink
 * сервер привязывает его авторизацию на fb к юзеру
 */

var querystring = require('querystring');
var express = require('express');
var passport = require('passport');
var db = require('./../../db');
var log = require('./../../libs/log');
var decryptBody = require('./../../libs/decryptBody');
var utils = require('./../../libs/utils');
var config = require('./../../libs/config');

var cipher = utils.Cipher();

var router = express.Router();


// Redirect the user to Facebook for authentication.  When complete,
// Facebook will redirect the user back to the application at api/auth/facebook/callback
router.get('/', passport.authenticate('facebook', {scope: 'email'}));

// Facebook will redirect the user to this URL after approval.  Finish the
// authentication process by attempting to obtain an access token.  If
// access was granted, the user will be logged in.  Otherwise,
// authentication has failed.
router.get('/callback', passport.authenticate('facebook', {session: false}),
    /**
     * on success
     * пишем в БД временный токен
     */
    function (req, res) {
        var temporaryToken = utils.token();
        var temporaryExpirationDate = utils.calculateExpirationDate(config.get('temporaryTokenExpiresIn'));
        db.socialTemporaryTokens.save(temporaryToken, 'facebook', temporaryExpirationDate, req.user.profile, req.user.accessToken, req.user.refreshToken, function (err) {
            if (err) {
                log.error(err);
                res.redirect(req.baseUrl + '/failure');
                return;
            }

            res.redirect(req.baseUrl + '/success?' + querystring.stringify({token: temporaryToken}));
        });
    },

    // on error; likely to be something FacebookTokenError token invalid or already used token, these errors occur when the user logs in twice with the same token
    function (err, req, res, next) {
        if (err) {
            log.error(err);
        }

        res.redirect(req.baseUrl + '/failure');
    });

// вспомогательный url
router.get('/success', function (req, res) {
    res.status(200).end();
});

// вспомогательный url
router.get('/failure', function (req, res) {
    res.status(200).end('Something went wrong. Please try again later.');
});


router.post('/signin',
    passport.authenticate('basic', {session: false}),
    decryptBody,
    function (req, res) {
        if (!req.body.token) {
            res.status(400).end();
            return;
        }

        db.socialTemporaryTokens.find(req.body.token, function (err, data) {
            if (err) {
                log.error(err);
                res.status(500).end();
                return;
            }

            // login or register
            db.users.social.signin(data.social, data.profile.id, data.profile.displayName, data.profile._json, function (err, user) {
                if (err) {
                    log.error(err);
                    res.status(500).end();
                    return;
                }

                // create tokens and return user data
                var accessToken = utils.token();
                var expirationDate = utils.calculateExpirationDate();
                db.accessTokens.save(accessToken, expirationDate, user.userId, req.user.clientId, function (err) {
                    if (err) {
                        log.error(err);
                        res.status(500).end();
                        db.users.delete(user.userId);
                        return;
                    }

                    var refreshToken = utils.token();
                    db.refreshTokens.save(refreshToken, user.userId, req.user.clientId, function (err) {
                        if (err) {
                            log.error(err);
                            res.status(500).end();
                            db.users.delete(user.userId);
                            return;
                        }

                        res.json(cipher.encryptJSON({
                            userId: user.userId,
                            accessToken: accessToken,
                            refreshToken: refreshToken,
                            expiresIn: expirationDate,

                            email: req.body.email,
                            username: req.body.username,
                            userData: req.body.userData
                        }, req.user.clientSecret));
                    });
                });
            });
        });
    });


router.post('/link',
    passport.authenticate('bearer', {session: false}),
    decryptBody,
    function (req, res) {
        if (!req.body.token) {
            res.status(400).end();
            return;
        }

        db.socialTemporaryTokens.find(req.body.token, function (err, data) {
            if (err) {
                log.error(err);
                res.status(500).end();
                return;
            }

            db.users.social.link(req.user.userId, data.social, data.profile.id, function (err) {
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
 * отвязать социальную сеть
 * @param social
 */
router.get('/unlink',
    passport.authenticate('bearer', {session: false}),
    function (req, res) {
        db.users.social.unlink(req.user.userId, req.query.social, function (err) {
            if (err) {
                log.error(err);
                res.status(500).end();
                return;
            }

            res.status(200).end();
        });
    });


module.exports = router;