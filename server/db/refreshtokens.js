var tokens = {};


module.exports.find = function (key, done) {
    var token = tokens[key];
    return done(null, token);
};

module.exports.save = function (token, userID, clientID, done) {
    tokens[token] = {userID: userID, clientID: clientID};
    return done(null);
};

module.exports.delete = function (key, done) {
    delete tokens[key];
    return done(null);
};