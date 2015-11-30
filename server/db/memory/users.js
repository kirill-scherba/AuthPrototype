var utils = require('./../../libs/utils');

var users = {};

var emailsMap = new Map();

module.exports.save = function (id, email, username, hashPassword, data, done) {
    if (emailsMap.has(email)) { // проверим дублирование email
        done(new Error("EMAIL_EXISTS"));
        return;
    }

    var newUser = {
        userId: id,
        email: email,
        username: username,
        hashPassword: hashPassword,
        registerDate: new Date(),
        data: data
    };
    users[id] = newUser;
    emailsMap.set(email, id);

    done(null, newUser);
};

module.exports.find = function (id, done) {
    var user = users[id];

    if (user.deactivated) {
        done(null, null);
        return;
    }

    done(null, user);
};

module.exports.findByEmail = function (email, done) {
    var id = emailsMap.get(email);
    if (!id) {
        done(new Error("EMAIL_NOT_FOUND"));
        return;
    }

    var user = users[id];

    if (user.deactivated) {
        done(null, null);
        return;
    }

    done(null, user);
};

module.exports.delete = function (id, done) {
    var email = users[id].email;
    delete users[id];
    emailsMap.delete(email); // удаляем еще из список с имейлами

    if (typeof done === 'function') {
        done(null);
    }
};

module.exports.setTwoFactor = function (id, twoFactor, done) {
    users[id].twoFactor = twoFactor;

    if (typeof done === 'function') {
        done(null);
    }
};

module.exports.disableTwoFactor = function (id, done) {
    users[id].twoFactor = null;

    if (typeof done === 'function') {
        done(null);
    }
};

module.exports.setPassword = function (id, hashPassword, done) {
    users[id].hashPassword = hashPassword;

    if (typeof done === 'function') {
        done(null);
    }
};

module.exports.deactivate = function (id, done) {
    users[id].deactivated = new Date();
    done(null);
};

module.exports.setGroupByEmail = function (email, group, done) {
    var id = emailsMap.get(email);
    if (!id) {
        done(new Error("EMAIL_NOT_FOUND"));
        return;
    }

    if (!users[id].groups) {
        users[id].groups = [group];
    } else if (users[id].groups.indexOf(group) === -1) {
        users[id].groups.push(group);
    }

    done(null);
};

module.exports.setUsername = function (id, username, done) {
    users[id].username = username;
    done(null);
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
            var newUser = {
                userId: userId,
                username: username,
                registerDate: new Date(),
                data: data
            };
            newUser[social] = profileId;

            users[userId] = newUser;

            done(null, newUser);
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

            users[id][social] = profileId;

            if (typeof done === 'function') {
                done(null);
            }
        });
    },

    unlink: function (id, social, done) {
        users[id][social] = null;

        if (typeof done === 'function') {
            done(null);
        }
    },

    find: function (social, profileId, done) {
        for (var i in users) {
            if (users.hasOwnProperty(i)) {
                if (!users[i].deactivated && users[i][social] === profileId) {
                    done(null, users[i]);
                    return;
                }
            }
        }

        done(null, null);
    }
};