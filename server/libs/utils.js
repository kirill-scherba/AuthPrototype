var crypto = require('crypto');
var uuid = require('node-uuid');
var config = require('./../libs/config');

// regular expression for validating email
var re = /^([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22))*\x40([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d))*$/;


module.exports.uid = function () {
    return uuid.v4();
};

/**
 * Generate token
 * @param {number} [size=32]
 * @return {string}
 */
module.exports.token = function (size) {
    if (!size) {
        size = 32;
    }

    return crypto.randomBytes(size).toString('hex');
};


/** hash sum of the password to store */
module.exports.getHash = function (password) {
    return crypto.createHash('sha512').update(password).digest('hex');
};


/** random password */
module.exports.generatePassword = function () {
    return Math.random()    // Generate random number, eg: 0.123456
        .toString(36)       // Convert  to base-36 : "0.4fzyo82mvyr"
        .slice(-8);         // Cut off last 8 characters : "yo82mvyr"
};


/** generate token (path of url) for confirmation by email */
module.exports.emailToken = function (userStr) {
    //рандом + timestamp + e-mail + соль
    var shasum = crypto.createHash('sha512');
    shasum.update(Math.floor((Math.random() * 100) + 137).toString());
    shasum.update(Date.now().toString());
    shasum.update(userStr);
    shasum.update("dsfsdf34rr34cvy6bh567h56756354g5g3g5345345v4e5645645ff5r6b546546bb 456rtg;sfpoebg;a");
    return shasum.digest('hex');
};


module.exports.validateEmail = function (email) {
    return re.test(email);
};

/**
 * Calculate expiration date for token
 * @param {number} [expiresIn] - ms
 * @return {Date}
 */
module.exports.calculateExpirationDate = function (expiresIn) {
    if (!expiresIn) {
        expiresIn = config.get('accessTokenExpiresIn');
    }

    return new Date(new Date().getTime() + (expiresIn * 1000));
};


/**
 * Object for encryption and decryption
 * @param {String} [algorithm=aes-256-ctr]
 * @return {{encrypt: Function, decrypt: Function}}
 * @constructor
 *
 *
 *
 // using CryptoJS

 function decrypt(text, secret) {
	var ciphertext = CryptoJS.enc.Hex.parse(text); // text in hex
	var salt = CryptoJS.lib.WordArray.create(0); // empty array
	var decrypted = CryptoJS.AES.decrypt({ciphertext: ciphertext, salt: salt}, secret);
	return decrypted.toString(CryptoJS.enc.Utf8)
}

 function encrypt(text, secret) {
	var salt = CryptoJS.lib.WordArray.create(0); // empty array
	var params = CryptoJS.kdf.OpenSSL.execute(secret, 256/32, 128/32, salt);
	var encrypted = CryptoJS.AES.encrypt(text, params.key, {iv: params.iv});
	return encrypted.ciphertext.toString();
}
 */
module.exports.Cipher = function (algorithm) {
    algorithm = algorithm || 'aes-256-cbc';

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
        },

        encryptJSON: function (data, secret) {
            return {
                data: this.encrypt(JSON.stringify(data), secret)
            };
        },

        decryptJSON: function (data, secret) {
            var result;

            try {
                result = JSON.parse(this.decrypt(data, secret));
            } catch (e) {
            }

            return result;
        }
    };
};


/**
 * Replace string by template
 *
 * Example:
 * var str = "I have a {cat}, a {dog}, and a {goat} and a {goat}."
 * var mapObj = {
 *   cat:"dog",
 *   dog:"goat",
 *   goat:"cat"
 * };
 *
 * replaceByTemplate(str, mapObj) // "I have a dog, a goat, and a cat and a cat."
 *
 * @param {String} str
 * @param {Object} mapObj
 * @return {string}
 */
module.exports.replaceByTemplate = function (str, mapObj) {
    var template = Object.keys(mapObj).map(function (key) {
        return '{' + key + '}';
    }).join("|");
    var re = new RegExp(template, "gi");

    return str.replace(re, function (matched) {
        return mapObj[matched.toLowerCase().slice(1, -1)];
    });
};