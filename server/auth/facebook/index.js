// https://github.com/scotch-io/easy-node-authentication/blob/linking/app/routes.js
// https://scotch.io/tutorials/easy-node-authentication-linking-all-accounts-together
//http://stackoverflow.com/a/11213722

var express = require('express');
var passport = require('passport');
var db = require('./../../db');

var router = express.Router();

// =============================================================================
// AUTHENTICATE (FIRST LOGIN) ==================================================
// =============================================================================

// Redirect the user to Facebook for authentication.  When complete,
// Facebook will redirect the user back to the application at
//     api/auth/facebook/callback
router.get('/', passport.authenticate('facebook', {scope: 'email'}));

// Facebook will redirect the user to this URL after approval.  Finish the
// authentication process by attempting to obtain an access token.  If
// access was granted, the user will be logged in.  Otherwise,
// authentication has failed.
router.get('/callback', passport.authenticate('facebook', {
        //successRedirect: '/?status=success',
        //failureRedirect: '/?status=failure',
        session: false
    }),
    // on success
    function (req, res) {
        // return the token or you would wish otherwise give eg. a succes message
        res.json({success: "success", data: JSON.stringify(req.user.access_token)}).end();
    },

    // on error; likely to be something FacebookTokenError token invalid or already used token,
    // these errors occur when the user logs in twice with the same token
    function (err, req, res, next) {
        // You could put your own behavior in here, fx: you could force auth again...
        // res.redirect('/auth/facebook/');
        if (err) {
            res.status(400);
            res.send({error: "error", message: err.message}).end();
        }
    });


// =============================================================================
// AUTHORIZE (ALREADY LOGGED IN / CONNECTING OTHER SOCIAL ACCOUNT) =============
// =============================================================================

// send to facebook to do the authentication
router.get('/connect', passport.authenticate('facebook-connect', {scope: 'email'}));

// handle the callback after facebook has authorized the user
router.get('/connect/callback',
    passport.authenticate('bearer', {session: false}),
    passport.authenticate('facebook-connect', {
        successRedirect: '/?status=success',
        failureRedirect: '/?status=failure',
        session: false
    }));


// =============================================================================
// UNLINK ACCOUNTS =============================================================
// =============================================================================

router.get('/unlink',
    passport.authenticate('bearer', {session: false}),
    function (req, res) {
        db.users.setUnlinkFb(req.user.userId, function (err) {
            if (err) {
                res.status(500).end();
                return;
            }

            res.status(200).end();
        });
    });


module.exports = router;