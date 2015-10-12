var db = require('./../db/index');


/**
 * Авторизация для потоков.
 * Клиент посылает в поток запрос на авторизацию, функция авторизует, клиент пользуется каналом.
 * @param clientId
 * @param clientSecret
 * @param accessToken
 * @param done
 */
module.exports.check = function (clientId, clientSecret, accessToken, done) {
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


        db.accessTokens.find(accessToken, function (err, token) {
            if (err) {
                return done(err);
            }

            if (!token || !token.clientId) {
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

                    return done(null, {userId: user.userId});
                });
            }
        });
    });
};