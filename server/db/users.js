var users = {};

var emailsMap = new Map();

module.exports.save = function (id, email, username, hashPassword, data, done) {
    if (emailsMap.has(email)) { // проверим дублирование email
        done(new Error({code: "EMAIL_EXISTS", message: "Duplicate email"}));
        return;
    }

    users[id] = {id: id, email: email, username: username, hashPassword: hashPassword, registerDate: new Date(), data: data};
    emailsMap.set(email, id);
    done(null);
};

module.exports.find = function (id, done) {
    var user = users[id];
    return done(null, user);
};

module.exports.findByEmail = function (email, done) {
    var id = emailsMap.get(email);
    if (!id) {
        done(new Error({code: "EMAIL_NOT_FOUND", message: "Email not found"}));
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

//module.exports.findByUsername = function (username, done) {
//    for (var i in users) {
//        if (users.hasOwnProperty(i)) {
//            if (users[i].username === username) {
//                return done(null, users[i]);
//            }
//        }
//    }
//    return done(null, null);
//};