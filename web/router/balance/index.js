module.exports = function (wallet) {
    return function (req, res, next) {
        wallet.getBalance(function(err, balance) {
            if (err) return next(err);
            res.json(balance);
        });
    }
};