module.exports = function (wallet) {
    return function (req, res, next) {
        wallet.getBalance(req.opts.includeUnconfirmed, function(err, balance) {
            if (err) return next(err);
            req.result = balance;
            next();
        });
    }
};