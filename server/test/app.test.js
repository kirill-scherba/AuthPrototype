var crypto = require('crypto');
var request = require('supertest');
var should = require('should');
var app = require('../app');
var db = require('../db');

function getHash(password) {
    return crypto.createHash('sha512').update(password).digest('hex');
}

describe('integration testing signup', function () {
    var clientId;
    var clientSecret;
    var clientData = {a: 1};

    var email = "bob@gmail.com";
    var username = "bob";
    var password = "secret";
    var language = "en";

    var userAuthDataRegister;
    var userAuthDataLogin;
    var userAuthDataRefresh;

    describe("register_client", function () {
        it('should return json body on register_client', function (done) {
            request(app)
                .post('/api/auth/register_client')
                .send({clientData: clientData})
                .expect('Content-Type', /application\/json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    res.body.should.be.json;
                    res.body.clientId.should.not.be.empty;
                    res.body.clientSecret.should.not.be.empty;

                    clientId = res.body.clientId;
                    clientSecret = res.body.clientSecret;

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
                client.data.should.be.eql(clientData);

                done();
            });
        });
    });


    describe("register", function () {
        it("should register and return {user{}; accessToken; refreshToken; expiresIn}", function (done) {
            request(app)
                .post('/api/auth/register')
                .set('Authorization', 'Basic ' + new Buffer(clientId + ':' + clientSecret).toString('base64'))
                .send({
                    email: email,
                    hashPassword: getHash(password),
                    username: username,
                    userData: {language: language}
                })
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    res.body.should.be.json;
                    res.body.should.have.properties(['accessToken', 'refreshToken', 'expiresIn', 'userId']);

                    userAuthDataRegister = res.body;

                    console.log(res.body);
                    done();
                });
        });

        it("should return 400 + EMAIL_EXISTS", function (done) {
            request(app)
                .post('/api/auth/register')
                .set('Authorization', 'Basic ' + new Buffer(clientId + ':' + clientSecret).toString('base64'))
                .send({
                    email: email,
                    hashPassword: getHash(password),
                    username: username,
                    userData: {language: language}
                })
                .expect(400, "EMAIL_EXISTS", done);
        });

        it("should return 400 + INVALID_EMAIL", function (done) {
            request(app)
                .post('/api/auth/register')
                .set('Authorization', 'Basic ' + new Buffer(clientId + ':' + clientSecret).toString('base64'))
                .send({
                    email: "foo",
                    hashPassword: getHash(password),
                    username: username,
                    userData: {language: language}
                })
                .expect(400, "INVALID_EMAIL", done);
        });
    });

    describe("login", function () {
        it("should login", function (done) {
            request(app)
                .post('/api/auth/login')
                .set('Authorization', 'Basic ' + new Buffer(clientId + ':' + clientSecret).toString('base64'))
                .send({
                    email: email,
                    hashPassword: getHash(password)
                })
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    res.body.should.be.json;
                    res.body.should.have.properties(['accessToken', 'refreshToken', 'expiresIn', 'userId']);

                    userAuthDataLogin = res.body;

                    console.log(res.body);
                    done();
                });
        });

        it("should return 400 + WRONG_EMAIL_OR_PASSWORD, send wrong email", function (done) {
            request(app)
                .post('/api/auth/login')
                .set('Authorization', 'Basic ' + new Buffer(clientId + ':' + clientSecret).toString('base64'))
                .send({
                    email: "aa@aa.aa",
                    hashPassword: getHash(password)
                })
                .expect(400, "WRONG_EMAIL_OR_PASSWORD", done);

        });

        it("should return 400 + WRONG_EMAIL_OR_PASSWORD, send wrong password", function (done) {
            request(app)
                .post('/api/auth/login')
                .set('Authorization', 'Basic ' + new Buffer(clientId + ':' + clientSecret).toString('base64'))
                .send({
                    email: email,
                    hashPassword: getHash("dasddsfdsfsdf")
                })
                .expect(400, "WRONG_EMAIL_OR_PASSWORD", done);
        });

        it("should return 400 + HASHPASSWORD_IS_EMPTY", function (done) {
            request(app)
                .post('/api/auth/login')
                .set('Authorization', 'Basic ' + new Buffer(clientId + ':' + clientSecret).toString('base64'))
                .send({
                    email: email
                })
                .expect(400, "HASHPASSWORD_IS_EMPTY", done);
        });
    });

    describe("refresh", function () {
        it("should not refresh tokens, return 401", function (done) {
            request(app)
                .post('/api/auth/refresh')
                .set('Authorization', 'Basic ' + new Buffer(clientId + ':' + clientSecret).toString('base64'))
                .send({
                    refreshToken: userAuthDataRegister.refreshToken
                })
                .expect(401, done);
        });

        it("should refresh tokens", function (done) {
            request(app)
                .post('/api/auth/refresh')
                .set('Authorization', 'Basic ' + new Buffer(clientId + ':' + clientSecret).toString('base64'))
                .send({
                    refreshToken: userAuthDataLogin.refreshToken
                })
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    res.body.should.be.json;
                    res.body.should.have.properties(['accessToken', 'refreshToken', 'expiresIn', 'userId']);

                    userAuthDataRefresh = res.body;

                    console.log(res.body);
                    done();
                });
        });
    });

    it("should return 401, old tokens already deleted"); // TODO call protected resource! проверка BearerStrategy
});