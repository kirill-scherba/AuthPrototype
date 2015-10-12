var cipher = require('./utils').Cipher();

/**
 * Middleware расшифровывает тело запроса и ставит расшифрованный вариант в body
 */
module.exports = function (req, res, next) {
    if (req.body.data && req.user && req.user.clientSecret) {
        req.body = cipher.decryptJSON(req.body.data, req.user.clientSecret);
    }

    return next();
};