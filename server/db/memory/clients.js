var clients = {};


module.exports.find = function (id, done) {
    var client = clients[id];
    return done(null, client);
};

module.exports.save = function (id, secret, data, done) {
    clients[id] = {
        clientId: id,
        clientSecret: secret,
        registerDate: new Date(),
        data: data
    };

    if (typeof done === 'function') {
        done(null);
    }
};