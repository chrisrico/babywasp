module.exports = function (wallet) {
    return function (req, res, next) {
        wallet.send(req.opts, req.password, function (err, tx) {
            if (err) return next(err);
            req.result = tx.txid;
            next();
        });
    }
};