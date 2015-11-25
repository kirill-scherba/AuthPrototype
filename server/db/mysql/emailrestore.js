var sqlPool = require('./index').pool;

var query = {};
query.find = 'select email, token, dtCreate from emailRestore where email = ?;';
query.save = 'insert into emailRestore(email, token, dtCreate) values (?,?,?) on duplicate key update token=?, token = ?;;';


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
    var dtCreate = new Date();
    sqlPool.execute(query.save, [email, token, dtCreate, token, dtCreate], function (err) {
        if (typeof done === 'function') {
            done(err);
        }
    });
};