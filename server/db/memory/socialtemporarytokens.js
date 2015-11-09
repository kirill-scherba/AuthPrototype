var tokens = {};


module.exports.find = function (key, done) {
    var token = tokens[key];
    return done(null, token);
};

module.exports.save = function (token, social, expirationDate, profile, accessToken, refreshToken, done) {
    tokens[token] = {
        social: social,
        expirationDate: expirationDate,
        profile: profile,
        accessToken: accessToken,
        refreshToken: refreshToken
    };

    return done(null);
};

module.exports.delete = function (key, done) {
    delete tokens[key];
    return done(null);
};