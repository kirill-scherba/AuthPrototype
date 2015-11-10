var sqlPool = require('./index').pool;

var query = {};
query.find = 'select token, social, expirationDate, profile, accessToken, refreshToken from socialTemporaryTokens where token = ?;';
query.save = 'insert into socialTemporaryTokens(token, social, expirationDate, profile, accessToken, refreshToken) values (?,?,?,?,?,?);';
query.delete = 'delete from socialTemporaryTokens where token = ?;';


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
            social: rows[0].social,
            expirationDate: rows[0].expirationDate,
            profile: JSON.parse(rows[0].profile),
            accessToken: rows[0].accessToken,
            refreshToken: rows[0].refreshToken
        });
    });
};

module.exports.save = function (token, social, expirationDate, profile, accessToken, refreshToken, done) {
    sqlPool.execute(query.save, [token, social, expirationDate, JSON.stringify(profile), accessToken, refreshToken || null], function (err) {
        done(err);
    });
};

module.exports.delete = function (key, done) {
    sqlPool.execute(query.delete, [key], function (err) {
        done(err);
    });
};