// https://github.com/scotch-io/easy-node-authentication/blob/linking/app/routes.js
// https://scotch.io/tutorials/easy-node-authentication-linking-all-accounts-together

var express = require('express');
var passport = require('passport');

var router = express.Router();

// =============================================================================
// AUTHENTICATE (FIRST LOGIN) ==================================================
// =============================================================================

// Redirect the user to Facebook for authentication.  When complete,
// Facebook will redirect the user back to the application at
//     api/auth/facebook/callback
router.get('/', passport.authenticate('facebook', { scope : 'email' }));

// Facebook will redirect the user to this URL after approval.  Finish the
// authentication process by attempting to obtain an access token.  If
// access was granted, the user will be logged in.  Otherwise,
// authentication has failed.
router.get('/callback', passport.authenticate('facebook', {
    successRedirect: '/',
    failureRedirect: '/login',
    session: false
}));



// =============================================================================
// AUTHORIZE (ALREADY LOGGED IN / CONNECTING OTHER SOCIAL ACCOUNT) =============
// =============================================================================

// send to facebook to do the authentication
router.get('/connect', passport.authorize('facebook', { scope : 'email' }));

// handle the callback after facebook has authorized the user
router.get('/connect/facebook/callback',
    passport.authorize('facebook', {
        successRedirect : '/profile',
        failureRedirect : '/'
    }));


// =============================================================================
// UNLINK ACCOUNTS =============================================================
// =============================================================================
// used to unlink accounts. for social accounts, just remove the token
// for local account, remove email and password
// user account will stay active in case they want to reconnect in the future
// facebook -------------------------------
router.get('/unlink', function(req, res) {
    var user            = req.user;
    user.facebook.token = undefined;
    user.save(function(err) {
        res.redirect('/profile');
    });
});


module.exports = router;