var tokens = {};


module.exports.find = function (token, done) {
    var record = tokens[token];
    return done(null, record);
};

module.exports.save = function (email, token, done) {
    tokens[token] = {email: email, token: token, dtCreate: new Date()};

    if (typeof done === 'function') {
        done(null);
    }
};