var sqlPool = require('./index').pool;

var query = {};
query.save = 'insert into users(userId, email, username, hashPassword, registerDate, data) values (?,?,?,?,?,?);';
query.find = 'select userId, email, username, hashPassword, registerDate, data, facebook from users where userId = ?';
query.findByEmail = 'select userId, email, username, hashPassword, registerDate, data, facebook from users where email = ?';

module.exports.save = function (id, email, username, hashPassword, data, done) {
    sqlPool.execute(query.save, [id, email, username, hashPassword, new Date(), JSON.stringify(data)], function (err, result) {
        if (err && err.code === 'ER_DUP_ENTRY' && err.message.indexOf("'email'") !== -1) {
            done(new Error("EMAIL_EXISTS"));
            return;
        }

        if (err) {
            done(err);
            return;
        }

        done(null, {
            userId: id,
            email: email,
            username: username,
            hashPassword: hashPassword,
            registerDate: new Date(),
            data: data
        });
    });
};

module.exports.find = function (id, done) {
    sqlPool.execute(query.find, [id], function (err, rows) {
        if (err) {
            done(err);
            return;
        }

        done(null, {
            userId: rows[0].userId,
            email: rows[0].email,
            username: rows[0].username,
            hashPassword: rows[0].hashPassword,
            registerDate: rows[0].registerDate,
            data: JSON.parse(rows[0].data)
        });
    });
};

module.exports.findByEmail = function (email, done) {
    sqlPool.execute(query.findByEmail, [email], function (err, rows) {
        if (err) {
            done(err);
            return;
        }

        if (rows.length === 0) {
            done(new Error("EMAIL_NOT_FOUND"));
            return;
        }

        done(null, {
            userId: rows[0].userId,
            email: rows[0].email,
            username: rows[0].username,
            hashPassword: rows[0].hashPassword,
            registerDate: rows[0].registerDate,
            data: JSON.parse(rows[0].data)
        });
    });
};

module.exports.delete = function (id, done) {

};

module.exports.setTwoFactor = function (id, twoFactor, done) {

};

module.exports.disableTwoFactor = function (id, done) {

};

module.exports.setPassword = function (id, hashPassword, done) {

};