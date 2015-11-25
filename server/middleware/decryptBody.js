var cipher = require('./../libs/utils').Cipher();

/**
 * Middleware расшифровывает тело запроса и ставит расшифрованный вариант в body
 */
module.exports = function (req, res, next) {
    if (req.body.data && req.user && req.user.clientKey) {
        req.body = cipher.decryptJSON(req.body.data, req.user.clientKey);
    }

    return next();
};