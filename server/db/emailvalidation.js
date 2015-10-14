var tokens = {};


module.exports.find = function (email, done) {
    var record = tokens[email];
    return done(null, record);
};

module.exports.save = function (email, token, done) {
    tokens[email] = {email: email, token: token};
    return done(null);
};