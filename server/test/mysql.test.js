var utils = require('../libs/utils');
var db = require('../db/mysql/users');

describe('mysql tests', function () {
    it("should insert user", function (done) {
        var userId = utils.uid();
        db.save(userId, 'a@a3', 'a', 'secret', {a: 1},function (err, user) {
            console.log('arguments', arguments);

            done(err);
        });
    });

    it("should find user", function (done) {
        var userId = utils.uid();
        db.find('ea96a639-cdf4-4f45-b60d-6edd3e55854c',function (err, user) {
            console.log(user);

            done(err);
        });
    });
});