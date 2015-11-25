/**
 * middleware for check the group
 * @param group
 * @return {Function}
 */
module.exports = function (group) {
    return function (req, res, next) {
        if (req.user && req.user.group.indexOf(group) !== -1) {
            next();
        }
        else {
            res.send(401, 'Unauthorized');
        }
    };
};