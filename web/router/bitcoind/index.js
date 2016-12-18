var _address = require('../address');
var _balance = require('../balance');
var _send = require('../send');

module.exports = function (wallet) {
    var address = _address(wallet, function (address) {
        return [address];
    });
    var balance = _balance(wallet);
    var send = _send(wallet);

    return function (req, res, next) {
        switch (req.rpc) {
            case 'getaddressesbyaccount':
                return address(req, res, next);
            case 'getbalance':
                return balance(req, res, next);
            case 'sendfrom':
                return send(req, res, next);
            default:
                next('Unsupported remote procedure call: ' + req.rpc);
        }
    };
};