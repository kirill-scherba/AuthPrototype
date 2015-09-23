var tokens = {};


module.exports.find = function (key, done) {
    var token = tokens[key];
    return done(null, token);
};

module.exports.save = function (token, expirationDate, userId, clientId, done) {
    tokens[token] = {userId: userId, clientId: clientId, expirationDate: expirationDate};
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
        console.log("Deleting token:" + key);
        delete tokens[tokensToDelete[i]];
    }
    return done(null);
};

module.exports.removeAll = function (done) {
    tokens = {};
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