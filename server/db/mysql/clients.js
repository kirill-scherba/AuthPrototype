var sqlPool = require('./index').pool;

var query = {};
query.save = 'insert into clients(clientId, clientSecret, registerDate, data) values (?,?,?,?);';
query.find = 'select clientId, clientSecret, registerDate, data from clients where clientId = ?';


module.exports.find = function (id, done) {
    sqlPool.execute(query.find, [id], function (err, rows) {
        if (err) {
            done(err);
            return;
        }

        if (rows.length === 0) {
            done(null, null);
            return;
        }

        done(null, {
            clientId: rows[0].clientId,
            clientSecret: rows[0].clientSecret,
            registerDate: rows[0].registerDate,
            data: JSON.parse(rows[0].data)
        });
    });
};

module.exports.save = function (id, secret, data, done) {
    var registerDate = new Date();
    sqlPool.execute(query.save, [id, secret, registerDate, JSON.stringify(data)], function (err, result) {
        if (typeof done !== 'function') {
            return;
        }

        if (err) {
            done(err);
            return;
        }

        done(null, {
            clientId: id,
            clientSecret: secret,
            registerDate: registerDate,
            data: data
        });
    });
};