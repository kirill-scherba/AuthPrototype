'use strict';

const config = require('./config');

if (config.get('logger:tcp') === true) {
    const net = require('net');

    let client;


    let connect = function () {
        console.log('connect');
        client = net.connect({host: config.get('logger:host'), port: config.get('logger:port')}, () => { //'connect' listener
            console.log('connected to server!');
        });

        client.on('end', () => {
            console.log('disconnected from server');

            client = null;
            setTimeout(connect, config.get('logger:reconnectTimeout'));
        });

        client.on('error', (err) => {
            console.log('tcp logger error', err);
        });
    };

    connect();


    let send = function (level, data) {
        client.write(JSON.stringify({
                loglevel: level,
                time_local: Math.floor(Date.now() / 1000).toString(),
                app: 'AuthServer',
                data: data
            }) + '\n');
    };


    module.exports.error = function (err, message, data) {
        if (!err && !message && !data) {
            return;
        }

        var error = {};
        if (err instanceof Error) {
            var properties = Object.getOwnPropertyNames(err);
            for (var property, i = 0, len = properties.length; i < len; ++i) {
                error[properties[i]] = err[properties[i]];
            }
        }

        var logRecord = {
            error: error
        };

        if (message) {
            logRecord.message = message;
        }

        if (data) {
            logRecord.data = data;
        }

        send('ERROR', logRecord);
    };

    module.exports.info = function (message, data) {
        if (!message && !data) {
            return;
        }

        var logRecord = {};

        if (message) {
            logRecord.message = message;
        }

        if (data) {
            logRecord.data = data;
        }

        send('INFO', logRecord);
    };
} else {

    /**
     * Log error
     * @param {Error} err
     * @param {String} [message]
     * @param {Object} [data]
     */
    module.exports.error = function (err, message, data) {
        if (!err && !message && !data) {
            return;
        }

        var error = {};
        if (err instanceof Error) {
            var properties = Object.getOwnPropertyNames(err);
            for (var property, i = 0, len = properties.length; i < len; ++i) {
                error[properties[i]] = err[properties[i]];
            }
        }

        var logRecord = {
            type: 'error',
            when: new Date(),
            error: error
        };

        if (message) {
            logRecord.message = message;
        }

        if (data) {
            logRecord.data = data;
        }

        console.log(logRecord);
    };

    /**
     * Log info
     * @param {String} message
     * @param {Object} [data]
     */
    module.exports.info = function (message, data) {
        if (!message && !data) {
            return;
        }

        var logRecord = {
            type: 'info',
            when: new Date()
        };

        if (message) {
            logRecord.message = message;
        }

        if (data) {
            logRecord.data = data;
        }

        console.log(logRecord);
    };
}