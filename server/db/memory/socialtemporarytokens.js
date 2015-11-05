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

module.exports.removeExpired = function (done) {
    var tokensToDelete = [];
    for (var key in tokens) {
        if (tokens.hasOwnProperty(key)) {
            var token = tokens[key];
            if (new Date() > token.expirationDate) {
                tokensToDelete.push(key);
            }
        }
    }
    for (var i = 0; i < tokensToDelete.length; ++i) {
        delete tokens[tokensToDelete[i]];
    }
    return done(null);
};

module.exports.removeAll = function (done) {
    tokens = {};
    return done(null);
};
