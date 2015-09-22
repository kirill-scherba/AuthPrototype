var users = {};

var emailsSet = new Set();

module.exports.save = function (key, email, username, hashPassword, data, done) {
    if (emailsSet.has(email)) { // проверим дублирование email
        done(new Error({code: "EMAIL_EXISTS", message: "Duplicate email"}));
        return;
    }

    users[key] = {email: email, username: username, hashPassword: hashPassword, registerDate: new Date(), data: data};
    emailsSet.add(email);
    done(null)
};

module.exports.find = function (key, done) {
    var user = users[key];
    return done(null, user);
};

module.exports.delete = function (key, done) {
    var email = users[key].email;
    delete users[key];
    emailsSet.delete(email); // удаляем еще из список с имейлами

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