var utils = require('./../../libs/utils');
var sqlPool = require('./index').pool;

var query = {};
query.save = 'insert into users(userId, email, username, hashPassword, registerDate, data) values (?,?,?,?,?,?);';
query.find = 'select userId, email, username, hashPassword, registerDate, data, facebook, twoFactor from users where deactivated is null and userId = ?';
query.findByEmail = 'select userId, email, username, hashPassword, registerDate, data, facebook, twoFactor from users where deactivated is null and email = ?';
query.delete = 'CALL spDeleteUser(?);';
query.setTwoFactor = 'update users set twoFactor = ? where userId = ?;';
query.disableTwoFactor = 'update users set twoFactor = null where userId = ?;';
query.setPassword = 'update users set hashPassword = ? where userId = ?;';
query.socialUnlink = 'update users set ?? = null where userId = ?;';
query.socialFind = 'select userId, email, username, hashPassword, registerDate, data, facebook, twoFactor from users where deactivated is null and ?? = ?';
query.socialLink = 'update users set ?? = ? where userId = ?;';
query.socialSave = 'insert into users(userId, username, registerDate, data, ??) values (?,?,?,?,?);';
query.deactivate = 'update users set deactivated = NOW() where userId = ?;';
query.getGroups = 'select g.name from groups g inner join userGroup ug on g.groupId = ug.groupId where ug.userId = ?';
query.getGroupId = 'select groupId from groups where name = ?;';
query.setGroup = 'insert into userGroup(userId, groupId) values (?,?);';

function getDataFromRow(row, groups) {
    var twoFactor = null;
    // при использовании connection.query вместо null приходит <Buffer > для типа BLOB если в бд NULL
    if (row.twoFactor instanceof Buffer && row.twoFactor.length > 0) {
        twoFactor = JSON.parse(row.twoFactor);
    }

    groups = groups.map(function (group) {
        return group.name;
    });

    return {
        userId: row.userId,
        email: row.email,
        username: row.username,
        hashPassword: row.hashPassword,
        registerDate: row.registerDate,
        data: JSON.parse(row.data),
        facebook: row.facebook,
        twoFactor: twoFactor,
        groups: groups
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
    sqlPool.getConnection(function (err, connection) {
        if (err) {
            done(err);
            return;
        }

        connection.query(query.find, [id], function (err, rows) {
            if (err) {
                done(err);
                connection.release();
                return;
            }

            if (rows.length === 0) {
                done(null, null);
                connection.release();
                return;
            }

            connection.query(query.getGroups, [rows[0].userId], function (err, groups) {
                connection.release();
                if (err) {
                    done(err);
                    return;
                }

                done(null, getDataFromRow(rows[0], groups));
            });
        });
    });
};

module.exports.findByEmail = function (email, done) {
    sqlPool.getConnection(function (err, connection) {
        if (err) {
            done(err);
            return;
        }

        connection.query(query.findByEmail, [email], function (err, rows) {
            if (err) {
                done(err);
                connection.release();
                return;
            }

            if (rows.length === 0) {
                done(new Error("EMAIL_NOT_FOUND"));
                connection.release();
                return;
            }

            connection.query(query.getGroups, [rows[0].userId], function (err, groups) {
                connection.release();
                if (err) {
                    done(err);
                    return;
                }

                done(null, getDataFromRow(rows[0], groups));
            });
        });
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

module.exports.deactivate = function (id, done) {
    sqlPool.execute(query.deactivate, [id], function (err) {
        done(err);
    });
};


module.exports.setGroupByEmail = function (email, group, done) {
    // get user
    this.findByEmail(email, function (err, user) {
        if (err) {
            done(err);
            return;
        }

        if (user.groups.indexOf(group) === -1) {
            // if user not contain group
            sqlPool.getConnection(function (err, connection) {
                if (err) {
                    done(err);
                    return;
                }

                // get group id
                connection.query(query.getGroupId, [group], function (err, rows) {
                    if (err) {
                        done(err);
                        connection.release();
                        return;
                    }

                    if (rows.length === 0) {
                        done(new Error("GROUP_NOT_FOUND"));
                        connection.release();
                        return;
                    }

                    // add group for user
                    connection.query(query.setGroup, [user.userId, rows[0].groupId], function (err, groups) {
                        connection.release();
                        if (err) {
                            done(err);
                            return;
                        }

                        done(null);
                    });
                });
            });
        } else {
            done(null);
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
            sqlPool.getConnection(function (err, connection) {
                if (err) {
                    done(err);
                    return;
                }

                connection.query(query.socialSave, [social, userId, username, registerDate, JSON.stringify(data), profileId], function (err, result) {
                    connection.release();
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

            sqlPool.getConnection(function (err, connection) {
                if (err) {
                    done(err);
                    return;
                }

                connection.query(query.socialLink, [social, profileId, id], function (err) {
                    connection.release();
                    if (typeof done === 'function') {
                        done(err);
                    }
                });
            });
        });
    },

    unlink: function (id, social, done) {
        sqlPool.getConnection(function (err, connection) {
            if (err) {
                done(err);
                return;
            }

            connection.query(query.socialUnlink, [social, id], function (err) {
                connection.release();
                if (typeof done === 'function') {
                    done(err);
                }
            });
        });
    },

    find: function (social, profileId, done) {
        sqlPool.getConnection(function (err, connection) {
            if (err) {
                done(err);
                return;
            }

            connection.query(query.socialFind, [social, profileId], function (err, rows) {
                if (err) {
                    done(err);
                    return;
                }

                if (rows.length === 0) {
                    done(null, null);
                    return;
                }

                connection.query(query.getGroups, [rows[0].userId], function (err, groups) {
                    connection.release();
                    if (err) {
                        done(err);
                        return;
                    }

                    done(null, getDataFromRow(rows[0], groups));
                });
            });
        });
    }
};