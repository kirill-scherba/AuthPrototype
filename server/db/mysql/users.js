var utils = require('./../../libs/utils');
var sqlPool = require('./index').pool;

var query = {};
query.save = 'insert into users(userId, email, username, hashPassword, registerDate, data) values (?,?,?,?,?,?);';
query.find = 'select userId, email, username, hashPassword, registerDate, data, facebook, twoFactor from users where userId = ?';
query.findByEmail = 'select userId, email, username, hashPassword, registerDate, data, facebook, twoFactor from users where email = ?';
query.delete = 'CALL spDeleteUser(?);';
query.setTwoFactor = 'update users set twoFactor = ? where userId = ?;';
query.disableTwoFactor = 'update users set twoFactor = null where userId = ?;';
query.setPassword = 'update users set hashPassword = ? where userId = ?;';
query.socialUnlink = 'update users set ?? = null where userId = ?;';
query.socialFind = 'select userId, email, username, hashPassword, registerDate, data, facebook, twoFactor from users where ?? = ?';
query.socialLink = 'update users set ?? = ? where userId = ?;';
query.socialSave = 'insert into users(userId, username, registerDate, data, ??) values (?,?,?,?,?);';

function getDataFromRow(row) {
    return {
        userId: row.userId,
        email: row.email,
        username: row.username,
        hashPassword: row.hashPassword,
        registerDate: row.registerDate,
        data: JSON.parse(row.data),
        twoFactor: JSON.parse(row.twoFactor)
    };
}

module.exports.save = function (id, email, username, hashPassword, data, done) {
    var registerDate = new Date();
    sqlPool.execute(query.save, [id, email, username, hashPassword, registerDate, JSON.stringify(data)], function (err, result) {
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
            registerDate: registerDate,
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

        if (rows.length === 0) {
            done(null, null);
            return;
        }

        done(null, getDataFromRow(rows[0]));
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

        done(null, getDataFromRow(rows[0]));
    });
};

/**
 * используется в процессе регистрации для отката, если возникают ошибки при сохранении accessToken или refreshToken
 */
module.exports.delete = function (id, done) {
    sqlPool.execute(query.delete, [id], function (err) {
        if (typeof done === 'function') {
            done(err);
        }
    });
};

module.exports.setTwoFactor = function (id, twoFactor, done) {
    sqlPool.execute(query.setTwoFactor, [JSON.stringify(twoFactor), id], function (err) {
        if (typeof done === 'function') {
            done(err);
        }
    });
};

module.exports.disableTwoFactor = function (id, done) {
    sqlPool.execute(query.disableTwoFactor, [id], function (err) {
        if (typeof done === 'function') {
            done(err);
        }
    });
};

module.exports.setPassword = function (id, hashPassword, done) {
    sqlPool.execute(query.setPassword, [hashPassword, id], function (err) {
        if (typeof done === 'function') {
            done(err);
        }
    });
};

module.exports.social = {
    /**
     * login or register
     */
    signin: function (social, profileId, username, data, done) {
        this.find(social, profileId, function (err, user) {
            if (err) {
                done(err);
                return;
            }

            if (user) {
                done(null, user);
                return;
            }

            var userId = utils.uid();
            var registerDate = new Date();
            sqlPool.execute(query.socialSave, [social, userId, username, registerDate, JSON.stringify(data), profileId], function (err, result) {
                if (err) {
                    done(err);
                    return;
                }

                var newUser = {
                    userId: userId,
                    username: username,
                    registerDate: registerDate,
                    data: data
                };
                newUser[social] = profileId;

                done(null, newUser);
            });
        });
    },

    link: function (id, social, profileId, done) {
        this.find(social, profileId, function (err, user) {
            if (err) {
                done(err);
                return;
            }

            if (user) {
                // этот аккаунт привязан к другому пользователю
                done(new Error("EXISTS"));
                return;
            }

            sqlPool.execute(query.socialFind, [social, profileId, id], function (err) {
                if (typeof done === 'function') {
                    done(null);
                }
            });
        });
    },

    unlink: function (id, social, done) {
        sqlPool.execute(query.socialUnlink, [social, id], function (err) {
            if (typeof done === 'function') {
                done(err);
            }
        });
    },

    find: function (social, profileId, done) {
        sqlPool.execute(query.socialUnlink, [social, profileId], function (err, rows) {
            if (err) {
                done(err);
                return;
            }

            if (rows.length === 0) {
                done(null, null);
                return;
            }

            done(null, getDataFromRow(rows[0]));
        });
    }
};