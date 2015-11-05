var clients = {};


module.exports.find = function (id, done) {
    var client = clients[id];
    return done(null, client);
};

module.exports.save = function (id, secret, clientData, done) {
    clients[id] = {clientId: id, clientSecret: secret, data: clientData};

    if (typeof done === 'function') {
        done(null);
    }
};