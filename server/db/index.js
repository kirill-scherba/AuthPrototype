var config = require('./../libs/config');
var storage = config.get('storage');

module.exports.users = require('./' + storage + '/users');
module.exports.clients = require('./' + storage + '/clients');
module.exports.accessTokens = require('./' + storage + '/accesstokens');
module.exports.refreshTokens = require('./' + storage + '/refreshtokens');
module.exports.temporaryTokens = require('./' + storage + '/temporarytokens');
module.exports.emailValidation = require('./' + storage + '/emailvalidation');
module.exports.emailRestore = require('./' + storage + '/emailrestore'); // TODO not used because the new password is sent by email
module.exports.socialTemporaryTokens = require('./' + storage + '/socialtemporarytokens');