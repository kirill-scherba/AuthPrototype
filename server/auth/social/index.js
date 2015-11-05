var express = require('express');
var passport = require('passport');
var db = require('./../../db');
var log = require('./../../libs/log');
var decryptBody = require('./../../libs/decryptBody');
var utils = require('./../../libs/utils');
var helper = require('./../helper');

var cipher = utils.Cipher();

var router = express.Router();


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
                var expiresIn = utils.calculateExpirationDate();
                db.accessTokens.save(accessToken, expiresIn, user.userId, req.user.clientId, function (err) {
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

                        res.json(cipher.encryptJSON(
                            helper.getUserData(accessToken, refreshToken, expiresIn, user),
                            req.user.clientSecret));
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
                if (err && err.message === 'EXISTS') {
                    res.status(400).end('EXISTS'); // этот аккаунт социальной сети уже привязан к другому пользователю
                    return;
                }

                if (err) {
                    log.error(err);
                    res.status(500).end();
                    return;
                }

                // data.social, data.profile.id
                var socialData = {};
                socialData[data.social] = data.profile.id;

                res.json(cipher.encryptJSON(socialData, req.user.clientSecret));
            });
        });
    });


/**
 * отвязать социальную сеть
 * @param social
 */
router.post('/unlink',
    passport.authenticate('bearer', {session: false}),
    function (req, res) {
        db.users.social.unlink(req.user.userId, req.body.social, function (err) {
            if (err) {
                log.error(err);
                res.status(500).end();
                return;
            }

            res.status(200).end();
        });
    });


module.exports = router;