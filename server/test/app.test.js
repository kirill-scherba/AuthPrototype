var request = require('supertest');
var should = require('should');
var app = require('../app');
var db = require('../db');


describe('simple auth test', function () {
    var clientId;
    var clientSecret;
    var userData = {a: 1};

    it('should return json body on register_client', function (done) {
        request(app)
            .post('/api/auth/register_client')
            .send({user_data: userData})
            .expect('Content-Type', /application\/json/)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                res.body.should.be.json;
                res.body.id.should.not.be.empty;
                res.body.secret.should.not.be.empty;

                clientId = res.body.id;
                clientSecret = res.body.secret;

                console.log(res.body);
                done();
            });
    });

    it("database should contains clientId and clientSecret", function (done) {
        db.clients.find(clientId, function (err, client) {
            if (err) {
                return done(err);
            }
            console.log(client);

            client.should.not.be.undefined;
            client.secret.should.be.equal(clientSecret);
            client.data.should.be.eql(userData);

            done();
        })
    });
});