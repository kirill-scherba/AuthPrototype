module.exports.getUserData = function (accessToken, refreshToken, expiresIn, user) {
    return {
        userId: user.userId,

        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresIn: expiresIn,

        email: user.email,
        username: user.username,
        userData: user.data,
        hasPassword: Boolean(user.hashPassword), // есть ли пароль, пароля может не быть если пользователь вошел через социальную сеть. показывает отображать ли блок смены пароля в профиле

        facebook: user.facebook
    };
};