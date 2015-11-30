var nodemailer = require('nodemailer');
var log = require('./log');
var config = require('./config');

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
 * @param params - {email, url}
 * @param callback
 * @public
 */
function sendRestore(params, callback) {
    var subject = config.get('restorePassword:textForEmail:subject');
    var htmlBody = config.get('restorePassword:textForEmail:htmlBody').replace('{url}', params.url);
    var plaintextBody = config.get('restorePassword:textForEmail:plaintextBody').replace('{url}', params.url);

    var mailOptions = {
        from: config.get("smtp:from"),
        to: params.email,
        subject: subject,
        text: plaintextBody,
        html: htmlBody
    };

    send(mailOptions, callback);
}


/**
 * @param params - {email, url}
 * @param callback
 * @public
 */
function sendConfirmation(params, callback) {
    var subject = config.get('verificationEmail:textForEmail:subject');
    var htmlBody = config.get('verificationEmail:textForEmail:htmlBody').replace('{url}', params.url);
    var plaintextBody = config.get('verificationEmail:textForEmail:plaintextBody').replace('{url}', params.url);

    var mailOptions = {
        from: config.get("smtp:from"),
        to: params.email,
        subject: subject,
        text: plaintextBody,
        html: htmlBody
    };

    send(mailOptions, callback);
}


module.exports.sendRestore = sendRestore;
module.exports.sendConfirmation = sendConfirmation;