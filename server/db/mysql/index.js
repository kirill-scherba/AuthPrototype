var mysql = require('mysql2');
var config = require("./../../libs/config");

var pool = mysql.createPool(config.get('mysql'));

module.exports.pool = pool;