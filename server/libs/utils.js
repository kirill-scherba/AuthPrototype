var crypto = require('crypto');
var uuid = require('node-uuid');
var config = require('./../config');

// регулярка для валидации email
var re = /^([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22))*\x40([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d))*$/;


module.exports.uid = function () {
    return uuid.v4();
};

/**
 * Генерировать токен
 * @param {number} [size=32]
 * @return {string}
 */
module.exports.token = function (size) {
    if (!size) {
        size = 32;
    }

    return crypto.randomBytes(size).toString('hex');
};


/** хеш сумма от пароля для его хранения */
module.exports.getHash = function (password) {
    return crypto.createHash('sha512').update(password).digest('hex');
};


/** генерация токена (часть url) для подтверждения по email */
module.exports.emailToken = function (userStr) {
    //рандом + timestamp + e-mail + соль
    var shasum = crypto.createHash('sha512');
    shasum.update(Math.floor((Math.random() * 100) + 137).toString());
    shasum.update(Date.now().toString());
    shasum.update(userStr);
    shasum.update("dsfsdf34rr34cvy6bh567h56756354g5g3g5345345v4e5645645ff5r6b546546bb 456rtg;sfpoebg;a");
    return shasum.digest('hex');
};


/** Пароль должен содержать от 4 до 20 символов */
module.exports.validatePassword = function (password) {
    return password && password.length >= 4 && password.length <= 20;
};


module.exports.validateEmail = function (email) {
    return re.test(email);
};

/**
 * Посчитать дату истечения токена
 * @param {number} [expiresIn] - ms
 * @return {Date}
 */
module.exports.calculateExpirationDate = function (expiresIn) {
    if (!expiresIn) {
        expiresIn = config.accessTokenExpiresIn;
    }

    return new Date(new Date().getTime() + (expiresIn * 1000));
};


/**
 * Объект для шифрования и дешифрования
 * @param {String} [algorithm=aes-256-ctr]
 * @return {{encrypt: Function, decrypt: Function}}
 * @constructor
 */
module.exports.Cipher = function (algorithm) {
    algorithm = algorithm || 'aes-256-ctr';

    return {
        encrypt: function (text, secret) {
            var cipher = crypto.createCipher(algorithm, secret);
            var crypted = cipher.update(text, 'utf8', 'hex');
            crypted += cipher.final('hex');
            return crypted;
        },

        decrypt: function (text, secret) {
            var decipher = crypto.createDecipher(algorithm, secret);
            var dec = decipher.update(text, 'hex', 'utf8');
            dec += decipher.final('utf8');
            return dec;
        }
    };
};