module.exports = function (req, res, next) {
    if (req.get('authorization')) {
        var auth = req.get('authorization').split(' ')[1];
        var userPass = new Buffer(auth, 'base64').toString().split(':');
        req.rpc = req.body.method;
        req.password = userPass[1];
        req.body = {
            apiKey: userPass[1],
            outputs: [{
                toAddress: req.body.params[1],
                amount: parseFloat(req.body.params[2]) * Math.pow(10, 8)
            }],
            message: req.body.params[4]
        }
    }
    next();
};