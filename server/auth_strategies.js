var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var BasicStrategy = require('passport-http').BasicStrategy;
var BearerStrategy = require('passport-http-bearer').Strategy;
var db = require('./db');

/**
 * BasicStrategy
 *
 */
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


///**
// * LocalStrategy
// *
// */
//passport.use(new LocalStrategy(
//    function (username, password, done) {
//        db.users.findByUsername(username, function (err, user) {
//            if (err) {
//                return done(err);
//            }
//            if (!user) {
//                return done(null, false);
//            }
//            if (user.password != password) {
//                return done(null, false);
//            }
//            return done(null, user);
//        });
//    }
//));
//
//
///**
// * BearerStrategy
// *
// */
//passport.use(new BearerStrategy(
//    function (accessToken, done) {
//        db.accessTokens.find(accessToken, function (err, token) {
//            if (err) {
//                return done(err);
//            }
//            if (!token) {
//                return done(null, false);
//            }
//            if (new Date() > token.expirationDate) {
//                db.accessTokens.delete(accessToken, function (err) {
//                    return done(err);
//                });
//            } else {
//                if (token.userID !== null) {
//                    db.users.find(token.userID, function (err, user) {
//                        if (err) {
//                            return done(err);
//                        }
//                        if (!user) {
//                            return done(null, false);
//                        }
//                        // to keep this example simple, restricted scopes are not implemented,
//                        // and this is just for illustrative purposes
//                        var info = {scope: '*'};
//                        return done(null, user, info);
//                    });
//                } else {
//                    //The request came from a client only since userID is null
//                    //therefore the client is passed back instead of a user
//                    db.clients.find(token.clientID, function (err, client) {
//                        if (err) {
//                            return done(err);
//                        }
//                        if (!client) {
//                            return done(null, false);
//                        }
//                        // to keep this example simple, restricted scopes are not implemented,
//                        // and this is just for illustrative purposes
//                        var info = {scope: '*'};
//                        return done(null, client, info);
//                    });
//                }
//            }
//        });
//    }
//));
