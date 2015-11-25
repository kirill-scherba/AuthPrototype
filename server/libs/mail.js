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
    var subject = "Password recovery";
    var html_body = 'Hi, <br/> <br/> You recently requested кecovery password for your Zonkplay account. To enter a new password, please follow this link:<br/> <br/> <a href="' + params.url + '">' + params.url + '</a>';
    var plaintext_body = 'Hi,\n\nYou recently requested a new password for your Zonkplay account. To enter a new password, please follow this link:\n' + params.url;

    var mailOptions = {
        from: config.get("smtp:from"),
        to: params.email,
        subject: subject,
        text: plaintext_body,
        html: html_body
    };

    send(mailOptions, callback);
}


/**
 * @param params - {email, url}
 * @param callback
 * @public
 */
function sendConfirmation(params, callback) {
    var subject = "Complete registration";
    var html_body = 'Hi, <br/> <br/> We need to make sure you are human. Please verify your email and get started using your account. <br/> <br/> <a href="' + params.url + '">' + params.url + '</a>';
    var plaintext_body = 'Hi,\n\nWe need to make sure you are human. Please verify your email and get started using your account.\n' + params.url;

    var mailOptions = {
        from: config.get("smtp:from"),
        to: params.email,
        subject: subject,
        text: plaintext_body,
        html: html_body
    };

    send(mailOptions, callback);
}


module.exports.sendRestore = sendRestore;
module.exports.sendConfirmation = sendConfirmation;