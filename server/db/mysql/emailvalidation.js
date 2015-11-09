var sqlPool = require('./index').pool;

var query = {};
query.find = 'select email, token, dtCreate from emailValidation where email = ?;';
query.save = 'insert into emailValidation(email, token, dtCreate) values (?,?,?);';


module.exports.find = function (email, done) {
    sqlPool.execute(query.find, [email], function (err, rows) {
        if (err) {
            done(err);
            return;
        }

        if (rows.length === 0) {
            done(null, null);
            return;
        }

        done(null, {
            email: rows[0].email,
            token: rows[0].token,
            dtCreate: rows[0].dtCreate
        });
    });
};

module.exports.save = function (email, token, done) {
    sqlPool.execute(query.save, [email, token, new Date()], function (err) {
        if (typeof done === 'function') {
            done(err);
        }
    });
};