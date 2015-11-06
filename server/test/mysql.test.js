var utils = require('../libs/utils');
var db = require('../db/mysql/users');

describe('mysql tests', function () {
    it("should insert user", function (done) {
        var userId = utils.uid();
        db.save(userId, 'a@a1', 'a', 'secret', {a: 1},function (err, user) {
            console.log('arguments', arguments);

            done(err);
        });
    });
});