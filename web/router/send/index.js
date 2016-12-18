module.exports = function (wallet) {
    return function (req, res, next) {
        wallet.send(req.body, req.password, function (err, tx) {
            if (err) return next(err);
            res.json(tx.txid);
        });
    }
};