var cipher = require('./utils').Cipher();

/**
 * Middleware расшифровывает тело запроса и ставит расшифрованный вариант в body
 */
module.exports = function (req, res, next) {
    if (req.body.data && req.user && req.user.secret) {
        var data = cipher.decrypt(req.body.data, req.user.secret);

        try {
            req.body = JSON.parse(data);
        } catch (e) {
        }
    }

    return next();
};