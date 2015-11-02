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
var utils = require('./../../libs/utils');
var config = require('./../../libs/config');

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
                res.redirect('/api/auth/social/failure');
                return;
            }

            res.redirect('/api/auth/social/success?' + querystring.stringify({token: temporaryToken}));
        });
    },

    // on error; likely to be something FacebookTokenError token invalid or already used token, these errors occur when the user logs in twice with the same token
    function (err, req, res, next) {
        if (err) {
            log.error(err);
        }

        res.redirect('/api/auth/social/failure');
    });


module.exports = router;