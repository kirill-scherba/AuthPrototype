var crypto = require('crypto');
var uuid = require('node-uuid');


module.exports.uid = function () {
    return uuid.v4();
};

module.exports.token = function () {
    return crypto.randomBytes(32).toString('hex');
};


/** хеш сумма от пароля для его хранения */
module.exports.getHash = function (password) {
    return crypto.createHash('sha512').update(password).digest('hex');
};


/** генерация токена (часть url) для подтверждения по email */
module.exports.emailToken = function (user_str) {
    //рандом + timestamp + e-mail + соль
    var shasum = crypto.createHash('sha512');
    shasum.update(Math.floor((Math.random() * 100) + 137).toString());
    shasum.update(Date.now().toString());
    shasum.update(user_str);
    shasum.update("dsfsdf34rr34cvy6bh567h56756354g5g3g5345345v4e5645645ff5r6b546546bb 456rtg;sfpoebg;a");
    return shasum.digest('hex');
};