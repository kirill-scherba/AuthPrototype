var async = require('async');
var passport = require('passport');
var BasicStrategy = require('passport-http').BasicStrategy;
var BearerStrategy = require('passport-http-bearer').Strategy;
var TotpStrategy = require('passport-totp').Strategy;

var db = require('./../db/index');


passport.use(new BasicStrategy(
    function (clientId, clientSecret, done) {
        db.clients.find(clientId, function (err, client) {
            if (err) {
                return done(err);
            }
            if (!client) {
                return done(null, false);
            }
            if (client.clientSecret !== clientSecret) {
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

                    user.clientId = token.clientId;
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

                async.parallel([
                        function (callback) {
                            db.users.find(token.userId, callback);
                        },
                        function (callback) {
                            db.clients.find(token.clientId, callback);
                        }
                    ],
                    function (err, results) {
                        if (err) {
                            return done(err);
                        }
                        if (!results[0] || !results[1]) {
                            return done(null, false);
                        }


                        var user = results[0];
                        user.clientId = results[1].clientId;
                        user.clientSecret = results[1].clientSecret;
                        user.clientData = results[1].data;
                        return done(null, user);
                    });
            }
        });
    }
));


passport.use(new TotpStrategy({window: 1}, // TODO время жизни кода 2 минуты
    function (user, done) {
        // user получен через temporary-bearer стратегию
        if (!user) {
            return done(null, false);
        }

        return done(null, user.twoFactor.key, user.twoFactor.period);
    }
));
