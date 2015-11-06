var sqlPool = require('./index').pool;

var query = {};
query.save = 'insert into users(userId, email, username, hashPassword, registerDate, data) values (?,?,?,?,?,?);';

module.exports.save = function (id, email, username, hashPassword, data, done) {
    sqlPool.execute(query.save, [id, email, username, hashPassword, new Date(), data], function (err, result) {
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

};

module.exports.findByEmail = function (email, done) {

};

module.exports.delete = function (id, done) {

};

module.exports.setTwoFactor = function (id, twoFactor, done) {

};

module.exports.disableTwoFactor = function (id, done) {

};

module.exports.setPassword = function (id, hashPassword, done) {

};