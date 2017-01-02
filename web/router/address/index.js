module.exports = function (wallet) {
    return function (req, res, next) {
        wallet.getAddress(req.opts.force, function(err, address) {
            if (err) return next(err);
            req.result = address;
            next();
        });
    }
};