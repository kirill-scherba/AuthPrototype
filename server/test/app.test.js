var crypto = require('crypto');
var request = require('supertest');
var should = require('should');
var otp = require('otplib/lib/authenticator');
var app = require('../app');
var db = require('../db');
var streamAuth = require('./../auth/stream');
var utils = require('../libs/utils');
var cipher = utils.Cipher();


describe('integration testing signup', function () {
    var clientId;
    var clientSecret;
    var clientData = {a: 1};

    var email = "bob@gmail.com";
    var username = "bob";
    var password = "secret";
    var language = "en";

    var passwordNew = "password";

    var userAuthDataRegister;
    var userAuthDataLogin;
    var userAuthDataRefresh;
    var userAuthDataTwoFactor;


    function callMe(accessToken, done) {
        request(app)
            .get('/api/auth/me')
            .set('Authorization', 'Bearer ' + accessToken)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                res.body.should.be.json;
                res.body.clientId.should.not.be.empty;
                res.body.userId.should.not.be.empty;

                done();
            });
    }


    function callMeAndFail(token, done) {
        request(app)
            .get('/api/auth/me')
            .set('Authorization', 'Bearer ' + token)
            .expect(401, done);
    }


    function callRefreshAndFail(refreshToken, done) {
        request(app)
            .post('/api/auth/refresh')
            .set('Authorization', 'Basic ' + new Buffer(clientId + ':' + clientSecret).toString('base64'))
            .send({
                refreshToken: refreshToken
            })
            .expect(401, done);
    }


    describe("register-client", function () {
        it('should return json body on register-client', function (done) {
            request(app)
                .post('/api/auth/register-client')
                .send(clientData)
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

                    done();
                });
        });

        it("should return 400 + USER_DATA_IS_EMPTY", function (done) {
            request(app)
                .post('/api/auth/register-client')
                .expect(400, "USER_DATA_IS_EMPTY", done);
        });

        it("database should contains clientId and clientSecret", function (done) {
            db.clients.find(clientId, function (err, client) {
                if (err) {
                    return done(err);
                }
                client.should.not.be.undefined;
                client.clientSecret.should.be.equal(clientSecret);
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
                .send(cipher.encryptJSON({
                    email: email,
                    hashPassword: utils.getHash(password),
                    username: username,
                    userData: {language: language}
                }, clientSecret))
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    res.body.should.be.json;

                    var data = cipher.decryptJSON(res.body.data, clientSecret);

                    data.should.be.json;
                    data.accessToken.should.not.be.empty;
                    data.refreshToken.should.not.be.empty;
                    data.expiresIn.should.not.be.empty;
                    data.userId.should.not.be.empty;
                    data.email.should.not.be.empty;
                    data.username.should.not.be.empty;
                    data.userData.should.not.be.empty;

                    userAuthDataRegister = data;

                    done();
                });
        });

        it("should return 400 + EMAIL_EXISTS", function (done) {
            request(app)
                .post('/api/auth/register')
                .set('Authorization', 'Basic ' + new Buffer(clientId + ':' + clientSecret).toString('base64'))
                .send(cipher.encryptJSON({
                    email: email,
                    hashPassword: utils.getHash(password),
                    username: username,
                    userData: {language: language}
                }, clientSecret))
                .expect(400, "EMAIL_EXISTS", done);
        });

        it("should return 400 + INVALID_EMAIL", function (done) {
            request(app)
                .post('/api/auth/register')
                .set('Authorization', 'Basic ' + new Buffer(clientId + ':' + clientSecret).toString('base64'))
                .send(cipher.encryptJSON({
                    email: "foo",
                    hashPassword: utils.getHash(password),
                    username: username,
                    userData: {language: language}
                }, clientSecret))
                .expect(400, "INVALID_EMAIL", done);
        });
    });


    describe("login", function () {
        it("should login", function (done) {
            request(app)
                .post('/api/auth/login')
                .set('Authorization', 'Basic ' + new Buffer(clientId + ':' + clientSecret).toString('base64'))
                .send(cipher.encryptJSON({
                    email: email,
                    hashPassword: utils.getHash(password)
                }, clientSecret))
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    res.body.should.be.json;

                    var data = cipher.decryptJSON(res.body.data, clientSecret);

                    data.should.be.json;
                    data.accessToken.should.not.be.empty;
                    data.refreshToken.should.not.be.empty;
                    data.expiresIn.should.not.be.empty;
                    data.userId.should.not.be.empty;
                    data.email.should.not.be.empty;
                    data.username.should.not.be.empty;
                    data.userData.should.not.be.empty;

                    userAuthDataLogin = data;

                    done();
                });
        });

        it("should return 400 + WRONG_EMAIL_OR_PASSWORD, send wrong email", function (done) {
            request(app)
                .post('/api/auth/login')
                .set('Authorization', 'Basic ' + new Buffer(clientId + ':' + clientSecret).toString('base64'))
                .send(cipher.encryptJSON({
                    email: "aa@aa.aa",
                    hashPassword: utils.getHash(password)
                }, clientSecret))
                .expect(400, "WRONG_EMAIL_OR_PASSWORD", done);

        });

        it("should return 400 + WRONG_EMAIL_OR_PASSWORD, send wrong password", function (done) {
            request(app)
                .post('/api/auth/login')
                .set('Authorization', 'Basic ' + new Buffer(clientId + ':' + clientSecret).toString('base64'))
                .send(cipher.encryptJSON({
                    email: email,
                    hashPassword: utils.getHash("dasddsfdsfsdf")
                }, clientSecret))
                .expect(400, "WRONG_EMAIL_OR_PASSWORD", done);
        });

        it("should return 400 + HASHPASSWORD_IS_EMPTY", function (done) {
            request(app)
                .post('/api/auth/login')
                .set('Authorization', 'Basic ' + new Buffer(clientId + ':' + clientSecret).toString('base64'))
                .send(cipher.encryptJSON({
                    email: email
                }, clientSecret))
                .expect(400, "HASHPASSWORD_IS_EMPTY", done);
        });
    });


    describe("refresh", function () {
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

                    var data = cipher.decryptJSON(res.body.data, clientSecret);

                    data.should.be.json;
                    data.accessToken.should.not.be.empty;
                    data.refreshToken.should.not.be.empty;
                    data.expiresIn.should.not.be.empty;

                    userAuthDataRefresh = data;

                    done();
                });
        });

        // повторно нельзя получить authData по refreshToken
        it("should return 401 when you try get new authData(tokens) by used once refreshToken", function (done) {
            callRefreshAndFail(userAuthDataLogin.refreshToken, done);
        });
    });


    describe("check resource protection", function () {
        it("should return 200 and user data", function (done) {
            callMe(userAuthDataRefresh.accessToken, done);
        });

        it("should return 401 on request by secure path (/api/oauth/me) with wrong token", function (done) {
            callMeAndFail('ewfdsgfgdfghfdgsdgdfsgdfsfg', done);
        });

        it("should return 401 on request by secure path with old(already deleted) token", function (done) {
            callMeAndFail(userAuthDataLogin.accessToken, done);
        });

        it("should return 401 on request by secure path without token", function (done) {
            callMeAndFail(undefined, done);
        });
    });


    describe("websocket", function () {
        it("should authorize", function (done) {
            streamAuth.check(clientId, clientSecret, userAuthDataRefresh.accessToken, function (err, userData) {
                if (err) {
                    return done(err);
                }

                userData.should.be.ok;
                userData.should.be.json;
                done();
            });
        });

        it("should not authorize with wrong clientId", function (done) {
            streamAuth.check("111", clientSecret, userAuthDataRefresh.accessToken, function (err, userData) {
                if (err) {
                    return done(err);
                }

                userData.should.not.be.ok;
                done();
            });
        });

        it("should not authorize with wrong clientSecret", function (done) {
            streamAuth.check(clientId, "111", userAuthDataRefresh.accessToken, function (err, userData) {
                if (err) {
                    return done(err);
                }

                userData.should.not.be.ok;
                done();
            });
        });

        it("should not authorize with wrong accessToken", function (done) {
            streamAuth.check(clientId, clientSecret, "111", function (err, userData) {
                if (err) {
                    return done(err);
                }

                userData.should.not.be.ok;
                done();
            });
        });
    });


    describe("change-password", function () {
        it("should change password", function (done) {
            request(app)
                .post('/api/auth/change-password')
                .set('Authorization', 'Bearer ' + userAuthDataRefresh.accessToken)
                .send(cipher.encryptJSON({
                    current: utils.getHash(password),
                    new: utils.getHash(passwordNew)
                }, clientSecret))
                .expect(200, done);
        });

        it("should return 400 on request with wrong current password", function (done) {
            request(app)
                .post('/api/auth/change-password')
                .set('Authorization', 'Bearer ' + userAuthDataRefresh.accessToken)
                .send(cipher.encryptJSON({
                    current: utils.getHash(password),
                    new: utils.getHash(passwordNew)
                }, clientSecret))
                .expect(400, done);
        });

        it("should logout", function (done) {
            request(app)
                .post('/api/auth/logout')
                .set('Authorization', 'Bearer ' + userAuthDataRefresh.accessToken)
                .expect(200, done);
        });

        it("should login", function (done) {
            request(app)
                .post('/api/auth/login')
                .set('Authorization', 'Basic ' + new Buffer(clientId + ':' + clientSecret).toString('base64'))
                .send(cipher.encryptJSON({
                    email: email,
                    hashPassword: utils.getHash(passwordNew)
                }, clientSecret))
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    res.body.should.be.json;

                    var data = cipher.decryptJSON(res.body.data, clientSecret);

                    data.should.be.json;
                    data.accessToken.should.not.be.empty;
                    data.refreshToken.should.not.be.empty;
                    data.expiresIn.should.not.be.empty;
                    data.userId.should.not.be.empty;
                    data.email.should.not.be.empty;
                    data.username.should.not.be.empty;
                    data.userData.should.not.be.empty;

                    userAuthDataRefresh = data;

                    done();
                });
        });
    });


    describe("two-factor authentication", function () {
        var twoFactorData;
        var userTemporaryToken;

        it("should set two-factor authentication for user", function (done) {
            request(app)
                .post('/api/auth/setup-two-factor')
                .set('Authorization', 'Bearer ' + userAuthDataRefresh.accessToken)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    res.body.should.be.json;

                    var data = cipher.decryptJSON(res.body.data, clientSecret);

                    data.should.be.json;
                    data.twoFactor.should.be.json;
                    data.twoFactor.key.should.be.json;
                    data.twoFactor.otpUrl.should.be.json;
                    data.twoFactor.qrImage.should.be.json;

                    twoFactorData = data.twoFactor;

                    done();
                });
        });

        it("should return refreshToken on login request", function (done) {
            request(app)
                .post('/api/auth/login')
                .set('Authorization', 'Basic ' + new Buffer(clientId + ':' + clientSecret).toString('base64'))
                .send(cipher.encryptJSON({
                    email: email,
                    hashPassword: utils.getHash(passwordNew)
                }, clientSecret))
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    res.body.should.be.json;

                    var data = cipher.decryptJSON(res.body.data, clientSecret);

                    data.should.be.json;
                    data.temporaryToken.should.not.be.empty;
                    data.expiresIn.should.not.be.empty;

                    userTemporaryToken = data;

                    done();
                });
        });

        // TODO проблема с тем, что старые коды подходят какое-то время, период жизни кода непонятный
        it("should login on login-otp request", function (done) {
            request(app)
                .post('/api/auth/login-otp')
                .set('Authorization', 'Bearer ' + userTemporaryToken.temporaryToken)
                .send({
                    code: otp.generate(twoFactorData.key)
                })
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    res.body.should.be.json;

                    var data = cipher.decryptJSON(res.body.data, clientSecret);

                    data.should.be.json;
                    data.accessToken.should.not.be.empty;
                    data.refreshToken.should.not.be.empty;
                    data.expiresIn.should.not.be.empty;
                    data.userId.should.not.be.empty;
                    data.email.should.not.be.empty;
                    data.username.should.not.be.empty;
                    data.userData.should.not.be.empty;

                    userAuthDataTwoFactor = data;

                    done();
                });
        });

        it("should return 200 and user data", function (done) {
            callMe(userAuthDataTwoFactor.accessToken, done);
        });
    });


    describe("logout", function () {
        it("should logout", function (done) {
            request(app)
                .post('/api/auth/logout')
                .set('Authorization', 'Bearer ' + userAuthDataTwoFactor.accessToken)
                .expect(200, done);
        });

        it("should return 401 on request by secure path after logout", function (done) {
            callMeAndFail(userAuthDataTwoFactor.accessToken, done);
        });

        it("should return 401 when you try get new authData(tokens) after logout", function (done) {
            callRefreshAndFail(userAuthDataRefresh.refreshToken, done);
        });
    });
});