var clients = {};


module.exports.find = function (key, done) {
    var client = clients[key];
    return done(null, client);
};

module.exports.save = function (id, secret, data) {
    clients[id] = {secret: secret, data: data};
};