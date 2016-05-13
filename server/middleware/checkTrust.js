var config = require('./../libs/config');

// middleware for checking trusted client(server/app)
module.exports = function (req, res, next) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    var secret = req.body.secret;

    if (config.get('trusted').some((item) => ip === item.ip && secret === item.secret)) {
        req.body.trusted = true;
        next();
    } else {
        res.status(401).end();
    }
};