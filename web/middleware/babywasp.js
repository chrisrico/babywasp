module.exports = function (req, res, next) {
    req.password = req.get('x-api-key');
    req.body = {
        outputs: [{
            toAddress: req.params.address,
            amount: parseInt(req.query.amount)
        }],
        message: req.query.description
    };
    next();
};