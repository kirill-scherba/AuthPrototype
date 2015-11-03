module.exports.getUserData = function (accessToken, refreshToken, expiresIn, user) {
    return {
        userId: user.userId,
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresIn: expiresIn,

        email: user.email,
        username: user.username,
        userData: user.data
    };
};