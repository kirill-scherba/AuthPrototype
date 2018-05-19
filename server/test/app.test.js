var crypto = require('crypto');
var request = require('supertest');
var should = require('should');
var otp = require('otplib/lib/authenticator');
var app = require('../app');
var db = require('../db');
var sqlPool = require('../db/mysql').pool;
var streamAuth = require('./../auth/stream');
var utils = require('../libs/utils');
var config = require('../libs/config');
var cipher = utils.Cipher();


describe('integration testing signup', function () {
    var clientId;
    var clientSecret;
    var clientKey;
    var clientData = {a: 1};

    var email = "bob@gmail.com";
    var username = "bob";
    var newUsername = "new bob";
    var password = "secret";
    var language = "en";
    var redirectUrl = "https://www.google.com/";

    var passwordNew = "password";

    var userAuthDataRegister;
    var userAuthDataLogin;
    var userAuthDataRefresh;
    var userAuthDataTwoFactor;
    var userAuthDataDisableTwoFactor;


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

    function waitDb(callback) {
        if (config.get('storage') === 'mysql') {
            setTimeout(callback, 100);
        } else {
            callback();
        }
    }

    before(function (done) {
        if (config.get('storage') !== 'mysql') {
            done();
            return;
        }

        sqlPool.execute('select userId from users where email = ?', [email], function (err, rows) {
            if (err) {
                done(err);
                return;
            }

            if (rows.length === 0) {
                done();
                return;
            }

            db.users.delete(rows[0].userId, done);
        });
    });


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
                    res.body.clientKey.should.not.be.empty;

                    clientId = res.body.clientId;
                    clientSecret = res.body.clientSecret;
                    clientKey = res.body.clientKey;

                    done();
                });
        });

        it("should return 400 + USER_DATA_IS_EMPTY", function (done) {
            request(app)
                .post('/api/auth/register-client')
                .expect(400, "USER_DATA_IS_EMPTY", done);
        });

        it("database should contains clientId and clientSecret", function (done) {
            waitDb(function () { // в БД иногда не успевает записаться
                db.clients.find(clientId, function (err, client) {
                    if (err) {
                        return done(err);
                    }
                    client.should.not.be.undefined;
                    client.clientSecret.should.be.equal(clientSecret);
                    client.clientKey.should.be.equal(clientKey);
                    client.data.should.be.eql(clientData);

                    done();
                });
            });
        });
    });


    describe("validate client", function () {
        it("client should be valid", function (done) {
            request(app)
                .get('/api/auth/validate-client')
                .set('Authorization', 'Basic ' + new Buffer(clientId + ':' + clientSecret).toString('base64'))
                .expect(200, done);
        });

        it("client should not be valid", function (done) {
            request(app)
                .get('/api/auth/validate-client')
                .set('Authorization', 'Basic ' + new Buffer(clientId + ':' + '111').toString('base64'))
                .expect(401, done);
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
                    userData: {language: language},
                    params: {redirect: redirectUrl}
                }, clientKey))
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    res.body.should.be.json;

                    var data = cipher.decryptJSON(res.body.data, clientKey);

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
                }, clientKey))
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
                }, clientKey))
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
                }, clientKey))
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    res.body.should.be.json;

                    var data = cipher.decryptJSON(res.body.data, clientKey);

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
                }, clientKey))
                .expect(400, "WRONG_EMAIL_OR_PASSWORD", done);

        });

        it("should return 400 + WRONG_EMAIL_OR_PASSWORD, send wrong password", function (done) {
            request(app)
                .post('/api/auth/login')
                .set('Authorization', 'Basic ' + new Buffer(clientId + ':' + clientSecret).toString('base64'))
                .send(cipher.encryptJSON({
                    email: email,
                    hashPassword: utils.getHash("dasddsfdsfsdf")
                }, clientKey))
                .expect(400, "WRONG_EMAIL_OR_PASSWORD", done);
        });

        it("should return 400 + HASHPASSWORD_IS_EMPTY", function (done) {
            request(app)
                .post('/api/auth/login')
                .set('Authorization', 'Basic ' + new Buffer(clientId + ':' + clientSecret).toString('base64'))
                .send(cipher.encryptJSON({
                    email: email
                }, clientKey))
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

                    var data = cipher.decryptJSON(res.body.data, clientKey);

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
            waitDb(function () { // в БД иногда не успевает записаться
                callRefreshAndFail(userAuthDataLogin.refreshToken, done);
            });
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
                }, clientKey))
                .expect(200, done);
        });

        it("should return 400 on request with wrong current password", function (done) {
            request(app)
                .post('/api/auth/change-password')
                .set('Authorization', 'Bearer ' + userAuthDataRefresh.accessToken)
                .send(cipher.encryptJSON({
                    current: utils.getHash(password),
                    new: utils.getHash(passwordNew)
                }, clientKey))
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
                }, clientKey))
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    res.body.should.be.json;

                    var data = cipher.decryptJSON(res.body.data, clientKey);

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


    describe("change-username", function () {
        it("should update username", function (done) {
            request(app)
                .post('/api/auth/change-username')
                .set('Authorization', 'Bearer ' + userAuthDataRefresh.accessToken)
                .send({
                    username: newUsername
                })
                .expect(200, done);
        });

        it("should contain new username in db", function (done) {
            waitDb(function () { // в БД иногда не успевает записаться
                db.users.find(userAuthDataRefresh.userId, function (err, user) {
                    if (err) {
                        return done(err);
                    }

                    user.should.not.be.undefined;
                    user.username.should.be.eql(newUsername);

                    done();
                });
            });
        });
    });


    describe("change-user-data", function () {
        var newUserData = {b: 1};

        it("should update user data", function (done) {
            request(app)
                .post('/api/auth/change-user-data')
                .set('Authorization', 'Bearer ' + userAuthDataRefresh.accessToken)
                .send(cipher.encryptJSON({
                    userData: newUserData
                }, clientKey))
                .expect(200, done);
        });

        it("should contain new user data in db", function (done) {
            waitDb(function () { // в БД иногда не успевает записаться
                db.users.find(userAuthDataRefresh.userId, function (err, user) {
                    if (err) {
                        return done(err);
                    }

                    user.should.not.be.undefined;
                    user.data.should.be.eql(newUserData);

                    done();
                });
            });
        });
    });

    describe("add-group", function () {
        var group = 'confirmed_email';

        it("should return 401", function (done) {
            request(app)
                .post('/api/auth/add-group')
                .send({
                    secret: 'secret1',
                    userId: userAuthDataRefresh.userId,
                    group: group
                })
                .expect(401, done);
        });

        it("should add group", function (done) {
            request(app)
                .post('/api/auth/add-group')
                .send({
                    secret: 'secret',
                    userId: userAuthDataRefresh.userId,
                    group: group
                })
                .expect(200, done);
        });

        it("should return GROUP_NOT_FOUND", function (done) {
            request(app)
                .post('/api/auth/add-group')
                .send({
                    userId: userAuthDataRefresh.userId,
                    group: "test"
                })
                .expect(400, 'GROUP_NOT_FOUND', done);
        });

        it("should contain group in db", function (done) {
            waitDb(function () { // в БД иногда не успевает записаться
                db.users.find(userAuthDataRefresh.userId, function (err, user) {
                    if (err) {
                        return done(err);
                    }

                    user.should.not.be.undefined;
                    user.groups.should.be.containEql(group);

                    done();
                });
            });
        });
    });


    describe("setup-two-factor authentication", function () {
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

                    var data = cipher.decryptJSON(res.body.data, clientKey);

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
                }, clientKey))
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    res.body.should.be.json;

                    var data = cipher.decryptJSON(res.body.data, clientKey);

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

                    var data = cipher.decryptJSON(res.body.data, clientKey);

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


    describe("disable-two-factor authentication", function () {
        it("should return 400 on request with wrong password", function (done) {
            request(app)
                .post('/api/auth/disable-two-factor')
                .set('Authorization', 'Bearer ' + userAuthDataTwoFactor.accessToken)
                .send(cipher.encryptJSON({
                    hashPassword: utils.getHash('test')
                }, clientKey))
                .expect(400, done);
        });

        it("should disable-two-factor", function (done) {
            request(app)
                .post('/api/auth/disable-two-factor')
                .set('Authorization', 'Bearer ' + userAuthDataTwoFactor.accessToken)
                .send(cipher.encryptJSON({
                    hashPassword: utils.getHash(passwordNew)
                }, clientKey))
                .expect(200, done);
        });

        it("should login without two-factor", function (done) {
            request(app)
                .post('/api/auth/login')
                .set('Authorization', 'Basic ' + new Buffer(clientId + ':' + clientSecret).toString('base64'))
                .send(cipher.encryptJSON({
                    email: email,
                    hashPassword: utils.getHash(passwordNew)
                }, clientKey))
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    res.body.should.be.json;

                    var data = cipher.decryptJSON(res.body.data, clientKey);

                    data.should.be.json;
                    data.accessToken.should.not.be.empty;
                    data.refreshToken.should.not.be.empty;
                    data.expiresIn.should.not.be.empty;
                    data.userId.should.not.be.empty;
                    data.email.should.not.be.empty;
                    data.username.should.not.be.empty;
                    data.userData.should.not.be.empty;

                    userAuthDataDisableTwoFactor = data;

                    done();
                });
        });
    });


    describe("logout", function () {
        it("should logout", function (done) {
            request(app)
                .post('/api/auth/logout')
                .set('Authorization', 'Bearer ' + userAuthDataDisableTwoFactor.accessToken)
                .expect(200, done);
        });

        it("should return 401 on request by secure path after logout", function (done) {
            waitDb(function () { // в БД иногда не успевает записаться
                callMeAndFail(userAuthDataDisableTwoFactor.accessToken, done);
            });
        });

        it("should return 401 when you try get new authData(tokens) after logout", function (done) {
            callRefreshAndFail(userAuthDataRefresh.refreshToken, done);
        });
    });


    describe("deactivate", function () {
        var userAuthData;
        before("should login without two-factor", function (done) {
            request(app)
                .post('/api/auth/login')
                .set('Authorization', 'Basic ' + new Buffer(clientId + ':' + clientSecret).toString('base64'))
                .send(cipher.encryptJSON({
                    email: email,
                    hashPassword: utils.getHash(passwordNew)
                }, clientKey))
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    res.body.should.be.json;

                    var data = cipher.decryptJSON(res.body.data, clientKey);

                    data.should.be.json;
                    data.accessToken.should.not.be.empty;
                    data.refreshToken.should.not.be.empty;
                    data.expiresIn.should.not.be.empty;
                    data.userId.should.not.be.empty;
                    data.email.should.not.be.empty;
                    data.username.should.not.be.empty;
                    data.userData.should.not.be.empty;

                    userAuthData = data;

                    done();
                });
        });

        it("should deactivate", function (done) {
            request(app)
                .post('/api/auth/deactivate')
                .set('Authorization', 'Bearer ' + userAuthData.accessToken)
                .expect(200, done);
        });

        it("should not login", function (done) {
            request(app)
                .post('/api/auth/login')
                .set('Authorization', 'Basic ' + new Buffer(clientId + ':' + clientSecret).toString('base64'))
                .send(cipher.encryptJSON({
                    email: email,
                    hashPassword: utils.getHash(passwordNew)
                }, clientKey))
                .expect(400, done);
        })
    });
});