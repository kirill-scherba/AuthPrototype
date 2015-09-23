var clients = {};


module.exports.find = function (key, done) {
    var client = clients[key];
    return done(null, client);
};

module.exports.save = function (id, secret, client_data) {
    clients[id] = {id: id, secret: secret, data: client_data};
};