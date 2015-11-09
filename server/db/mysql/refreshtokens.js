var sqlPool = require('./index').pool;

var query = {};
query.find = 'select token, clientId, userId from refreshTokens where token = ?;';
query.save = 'insert into refreshTokens(token, clientId, userId) values (?,?,?);';
query.delete = 'delete from refreshTokens where token = ?;';
query.deleteByClientIdExceptNewToken = 'delete from refreshTokens where clientId = ? and token <> ?;';
query.deleteByClientId = 'delete from refreshTokens where clientId = ?;';

module.exports.find = function (key, done) {
    sqlPool.execute(query.find, [key], function (err, rows) {
        if (err) {
            done(err);
            return;
        }

        if (rows.length === 0) {
            done(null, null);
            return;
        }

        done(null, {
            token: rows[0].token,
            clientId: rows[0].clientId,
            userId: rows[0].userId
        });
    });
};

module.exports.save = function (token, userId, clientId, done) {
    sqlPool.execute(query.save, [token, clientId, userId], function (err) {
        done(err);
    });
};

module.exports.delete = function (key, done) {
    sqlPool.execute(query.delete, [key], function (err) {
        done(err);
    });
};

module.exports.deleteByClientIdExceptNewToken = function (clientId, newToken, done) {
    sqlPool.execute(query.deleteByClientIdExceptNewToken, [clientId, newToken], function (err) {
        if (typeof done === 'function') {
            done(err);
        }
    });
};

module.exports.deleteByClientId = function (clientId, done) {
    sqlPool.execute(query.deleteByClientId, [clientId], function (err) {
        if (typeof done === 'function') {
            done(err);
        }
    });
};