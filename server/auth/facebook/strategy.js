var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var config = require('./../config');


passport.use(new FacebookStrategy({
        clientID: config.facebook.clientId,
        clientSecret: config.facebook.clientSecret,
        callbackURL:  config.facebook.callbackURL,
        passReqToCallback : true
    },
    function(req, accessToken, refreshToken, profile, done) {
        console.log("req.user", req.user);
        done(new Error('not implemented')); // TODO сохранение и проверка лользователя по id социальной сети


        // ================================================================================
        //// check if the user is already logged in
        //if (!req.user) {
        //    // ищем пользователя по profile.id, если находим, то отдаем его
        //    // инача если можно регаться через соц сеть, то регаем его и отдаем юзера
        //
        //    User.findOne({ 'facebook.id' : profile.id }, function(err, user) {
        //        if (user) {
        //            // if there is a user id already but no token (user was linked at one point and then removed)
        //        } else {
        //            // if there is no user, create them
        //        }
        //    });
        //} else {
        //    // user already exists and is logged in, we have to link accounts
        //}


        // ================================================================================
        //// другой пример:
        //User.findOne({
        //    'google.id': profile.id
        //}, function(err, user) {
        //    if (!user) {
        //        user = new User({
        //            name: profile.displayName,
        //            email: profile.emails[0].value,
        //            role: 'user',
        //            username: profile.username,
        //            provider: 'google',
        //            google: profile._json
        //        });
        //        user.save(function(err) {
        //            if (err) done(err);
        //            return done(err, user);
        //        });
        //    } else {
        //        return done(err, user);
        //    }
        //});
    }
));