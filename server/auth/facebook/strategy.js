var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var config = require('./../../libs/config');


passport.use(new FacebookStrategy({
        clientID: config.get('facebook:clientId'),
        clientSecret: config.get('facebook:clientSecret'),
        callbackURL: config.get('facebook:callbackURL'),
        enableProof: true,
        passReqToCallback: true
    },
    function (req, accessToken, refreshToken, profile, done) {
        done(null, {
            profile: profile,
            accessToken: accessToken,
            refreshToken: refreshToken
        });
    }
));