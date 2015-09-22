var clients = {};


module.exports.find = function (key, done) {
    var client = clients[key];
    return done(null, client);
};

module.exports.save = function (clientId, clientSecret, data) {
    clients[clientId] = {clientSecret: clientSecret, data: data};
};