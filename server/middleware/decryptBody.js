var cipher = require('./../libs/utils').Cipher();

/**
 * Middleware for decrypt parameter 'data' from body
 */
module.exports = function (req, res, next) {
    if (req.body.data && req.user && req.user.clientKey) {
        var obj = cipher.decryptJSON(req.body.data, req.user.clientKey);
        if (!obj) {
            res.send(400);
            return;
        }

        req.body = obj;
        next();
    } else {
        res.send(400);
    }
};