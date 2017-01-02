var _address = require('../address');
var _balance = require('../balance');
var _send = require('../send');

module.exports = function (wallet) {
    function received_by_address(req, res, next) {
        wallet.client.getUtxos({addresses: [req.opts.address]}, function (err, utxos) {
            if (err) return next(err);
            req.result = utxos.reduce(function (balance, utxo) {
                if (utxo.confirmations >= req.opts.confirmations)
                    balance += utxo.satoshis;
                return balance;
            }, 0);
            next();
        });
    }

    var address = _address(wallet);
    var balance = _balance(wallet);
    var send = _send(wallet);

    return function (req, res, next) {
        switch (req.body.method) {
            case 'getnewaddress':
                return address(req, res, next);
            case 'getreceivedbyaddress':
                return received_by_address(req, res, next);
            case 'getaddressesbyaccount':
                return address(req, res, function (err) {
                    req.result = [req.result];
                    next(err);
                });
            case 'getbalance':
                return balance(req, res, next);
            case 'sendfrom':
                return send(req, res, next);
            default:
                next({code: -32601, message: 'Invalid method'});
        }
    };
};