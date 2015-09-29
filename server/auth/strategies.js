var passport = require('passport');
var BasicStrategy = require('passport-http').BasicStrategy;
var BearerStrategy = require('passport-http-bearer').Strategy;
var TotpStrategy = require('passport-totp').Strategy;

var db = require('./../db/index');


passport.use(new BasicStrategy(
    function (username, password, done) {
        db.clients.find(username, function (err, client) {
            if (err) {
                return done(err);
            }
            if (!client) {
                return done(null, false);
            }
            if (client.secret !== password) {
                return done(null, false);
            }
            return done(null, client);
        });
    }
));


passport.use(new BearerStrategy(
    function (accessToken, done) {
        db.accessTokens.find(accessToken, function (err, token) {
            if (err) {
                return done(err);
            }

            if (!token) {
                return done(null, false);
            }

            if (new Date() > token.expirationDate) {
                db.accessTokens.delete(accessToken, function (err) {
                    return done(err);
                });
            } else {
                if (!token.userId) { // сомнительное условие т.к. поле userId обязательное
                    return done(null, false);
                }

                db.users.find(token.userId, function (err, user) {
                    if (err) {
                        return done(err);
                    }
                    if (!user) {
                        return done(null, false);
                    }

                    return done(null, user);
                });
            }
        });
    }
));


passport.use('temporary-bearer', new BearerStrategy(
    function (temporaryToken, done) {
        db.temporaryTokens.find(temporaryToken, function (err, token) {
            if (err) {
                return done(err);
            }

            if (!token) {
                return done(null, false);
            }

            if (new Date() > token.expirationDate) {
                db.temporaryTokens.delete(temporaryToken, function (err) {
                    return done(err);
                });
            } else {
                if (!token.userId) { // сомнительное условие т.к. поле userId обязательное
                    return done(null, false);
                }

                db.users.find(token.userId, function (err, user) {
                    if (err) {
                        return done(err);
                    }
                    if (!user) {
                        return done(null, false);
                    }

                    return done(null, user);
                });
            }
        });
    }
));


passport.use(new TotpStrategy(
    function (user, done) {
        // user получен через temporary-bearer стратегию
        if (!user) {
            return done(null, false);
        }
        console.log(user.twoFactor);
        return done(null, user.twoFactor.key, user.twoFactor.period);
    }
));
