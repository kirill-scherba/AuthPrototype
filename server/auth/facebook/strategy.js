var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var config = require('./../../libs/config');
var utils = require('./../../libs/utils');
var db = require('./../../db');


/**
 * регистрация/вход
 */
passport.use(new FacebookStrategy({
        clientID: config.get('facebook:clientId'),
        clientSecret: config.get('facebook:clientSecret'),
        callbackURL: config.get('facebook:callbackURL'),
        enableProof: true,
        passReqToCallback: true
    },
    function (req, accessToken, refreshToken, profile, done) {
        var userId = utils.uid();
        db.users.createIfNotExistsWithFb(userId, profile.id, profile.displayName, profile._json, function (err) {
            if (err) {
                done(err);
                return;
            }

            done(null, profile);
            // basic авторизацию надо прикрутить
            // TODO выдача токенов, надо подумать как их передавать клиенту
            // например выдавать temporaryToken и по нему забирать остальные криденшалы
        });
    }
));


/**
 * Привязка аккаунта зарешистрированного пользователя
 */
passport.use('facebook-connect', new FacebookStrategy({
        clientID: config.get('facebook:clientId'),
        clientSecret: config.get('facebook:clientSecret'),
        callbackURL: config.get('facebook:callbackConnectURL'),
        enableProof: true,
        passReqToCallback: true
    },
    function (req, accessToken, refreshToken, profile, done) {
        db.users.setLinkFb(req.user.userId, profile.id, function (err) {
            if (err) {
                done(err);
                return;
            }

            done(null, req.user); // привязали fb и отдаем юзера
        });
    }
));