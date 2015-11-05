var config = require('./../libs/config');
var storage = config.get('storage');

exports.users = require('./' + storage + '/users');
exports.clients = require('./' + storage + '/clients');
exports.accessTokens = require('./' + storage + '/accesstokens');
exports.refreshTokens = require('./' + storage + '/refreshtokens');
exports.temporaryTokens = require('./' + storage + '/temporarytokens');
exports.emailValidation = require('./' + storage + '/emailvalidation');
exports.emailRestore = require('./' + storage + '/emailrestore');
exports.socialTemporaryTokens = require('./' + storage + '/socialtemporarytokens');