var tokens = {};


exports.find = function(key, done) {
    var token = tokens[key];
    return done(null, token);
};

exports.save = function(token, userID, clientID, done) {
    tokens[token] = { userID: userID, clientID: clientID };
    return done(null);
};

exports.delete = function (key, done) {
    delete tokens[key];
    return done(null);
};

exports.removeExpired = function (done) {
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

exports.removeAll = function (done) {
    tokens = {};
    return done(null);
};