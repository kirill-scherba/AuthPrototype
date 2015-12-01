var nodemailer = require('nodemailer');
var log = require('./log');
var config = require('./config');
var utils = require('./utils');

// create reusable transporter object using SMTP transport
var transporter = nodemailer.createTransport(config.get("smtp:options"));


/**
 * send mail
 * @param {object} mailOptions - mail
 * @param callback
 * @private
 */
function send(mailOptions, callback) {
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            log.error(error);
            if (typeof callback === 'function') {
                callback(error);
            }
        } else {
            if (typeof callback === 'function') {
                callback();
            }
            log.info('Message sent: ' + info.response);
        }
    });
}


/**
 * @param {String} email
 * @param {Object} params - mapObj for replacement by template
 * @param {Function} [callback]
 * @public
 */
function sendRestore(email, params, callback) {
    var subject = config.get('restorePassword:textForEmail:subject');
    var htmlBody = utils.replaceByTemplate(config.get('restorePassword:textForEmail:htmlBody'), params);
    var plaintextBody = utils.replaceByTemplate(config.get('restorePassword:textForEmail:plaintextBody'), params);

    var mailOptions = {
        from: config.get("smtp:from"),
        to: email,
        subject: subject,
        text: plaintextBody,
        html: htmlBody
    };

    send(mailOptions, callback);
}


/**
 * @param {String} email
 * @param {Object} params - mapObj for replacement by template
 * @param {Function} [callback]
 * @public
 */
function sendConfirmation(email, params, callback) {
    var subject = config.get('verificationEmail:textForEmail:subject');
    var htmlBody = utils.replaceByTemplate(config.get('verificationEmail:textForEmail:htmlBody'), params);
    var plaintextBody = utils.replaceByTemplate(config.get('verificationEmail:textForEmail:plaintextBody'), params);

    var mailOptions = {
        from: config.get("smtp:from"),
        to: email,
        subject: subject,
        text: plaintextBody,
        html: htmlBody
    };

    send(mailOptions, callback);
}


module.exports.sendRestore = sendRestore;
module.exports.sendConfirmation = sendConfirmation;