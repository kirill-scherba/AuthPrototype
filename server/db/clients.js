var clients = {};


module.exports.find = function (key, done) {
    var client = clients[key];
    return done(null, client);
};

module.exports.save = function (id, secret, clientData) {
    clients[id] = {clientId: id, secret: secret, data: clientData};
};