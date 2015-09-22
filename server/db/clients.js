var clients = {};


exports.find = function (key, done) {
    var client = clients[key];
    return done(null, client);
};

exports.save = function (clientId, clientSecret, data) {
    clients[clientId] = {clientSecret: clientSecret, data: data};
};