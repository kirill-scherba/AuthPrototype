var sqlPool = require('./index').pool;

var query = {};
query.find = 'select token, clientId, userId, expirationDate from temporaryTokens where token = ?;';
query.save = 'insert into temporaryTokens(token, clientId, userId, expirationDate) values (?,?,?,?);';
query.delete = 'delete from temporaryTokens where token = ?;';
query.deleteByClientIdExceptNewToken = 'delete from temporaryTokens where clientId = ? and token <> ?;';
query.deleteByClientId = 'delete from temporaryTokens where clientId = ?;';

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
            userId: rows[0].userId,
            expirationDate: rows[0].expirationDate
        });
    });
};

module.exports.save = function (token, expirationDate, userId, clientId, done) {
    sqlPool.execute(query.save, [token, clientId, userId, expirationDate], function (err) {
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