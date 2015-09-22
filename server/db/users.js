var users = {};


module.exports.save = function (id, username, password) {
    users[id] = {username: username, password: password};
};

module.exports.find = function (key, done) {
    var user = users[key];
    return done(null, user);
};

module.exports.findByUsername = function (username, done) {
    for (var i = 0, len = users.length; i < len; i++) {
        var user = users[i];
        if (user.username === username) {
            return done(null, user);
        }
    }
    return done(null, null);
};