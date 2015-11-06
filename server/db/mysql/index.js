var mysql = require('mysql2');
var config = require("./../../libs/config");

var mysql_config_name = process.env.NODE_ENV === 'cocaine' ? 'mysql_cocaine' : 'mysql';
var pool = mysql.createPool(config.get(mysql_config_name));

module.exports.pool = pool;