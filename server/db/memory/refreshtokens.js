var tokens = {};


module.exports.find = function (key, done) {
    var token = tokens[key];
    return done(null, token);
};

module.exports.save = function (token, userId, clientId, done) {
    tokens[token] = {userId: userId, clientId: clientId};
    return done(null);
};

module.exports.delete = function (key, done) {
    delete tokens[key];
    return done(null);
};

module.exports.deleteByClientIdExceptNewToken = function (clientId, newToken, done) {
    for (var token in tokens) {
        if (tokens.hasOwnProperty(token) && token !== newToken && tokens[token].clientId === clientId) {
            delete tokens[token];
        }
    }

    if (typeof done === 'function') {
        done(null);
    }
};

module.exports.deleteByClientId = function (clientId, done) {
    for (var token in tokens) {
        if (tokens.hasOwnProperty(token) && tokens[token].clientId === clientId) {
            delete tokens[token];
        }
    }

    if (typeof done === 'function') {
        done(null);
    }
};