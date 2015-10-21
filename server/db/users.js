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
    return done(null, user);
};

module.exports.findByEmail = function (email, done) {
    var id = emailsMap.get(email);
    if (!id) {
        done(new Error("EMAIL_NOT_FOUND"));
        return;
    }

    var user = users[id];
    return done(null, user);
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

module.exports.setPassword = function (id, hashPassword, done) {
    users[id].hashPassword = hashPassword;

    if (typeof done === 'function') {
        done(null);
    }
};


/**
 * Если аккаунт привязан к fb, то вернуть его, если нет, то создадим пользователя
 */
module.exports.createIfNotExistsWithFb = function (id, fb, username, data, done) {
    this.findByFb(fb, function (err, user) {
        if (err) {
            done(err);
            return;
        }

        if (user) {
            done(null, user);
            return;
        }

        var newUser = {
            userId: id,
            fb: fb, //fb id
            username: username,
            registerDate: new Date(),
            data: data
        };
        users[id] = newUser;

        done(null, newUser);
    });
};

module.exports.setLinkFb = function (id, fb, done) {
    this.findByFb(fb, function (err, user) {
        if (err) {
            done(err);
            return;
        }

        if (user) {
            // этот fb аккаунт привязан к другому пользователю
            done(new Error("EXISTS"));
            return;
        }

        users[id].fb = fb;

        if (typeof done === 'function') {
            done(null);
        }
    });
};

module.exports.setUnlinkFb = function (id, done) {
    users[id].fb = null;

    if (typeof done === 'function') {
        done(null);
    }
};

module.exports.findByFb = function (fb, done) {
    for (var i in users) {
        if (users.hasOwnProperty(i)) {
            if (users[i].fb === fb) {
                return done(null, users[i]);
            }
        }
    }
    return done(null, null);
};