module.exports = function (wallet, format) {
    return function (req, res, next) {
        wallet.getAddress(req.query.force == 'true', function(err, address) {
            if (err) return next(err);
            res.json(format(address));
        });
    }
};