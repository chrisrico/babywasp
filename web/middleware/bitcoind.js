var log = require('../../lib/log');

function isValidAddress(address) {
    return address && address.match(/^[123mn][a-km-zA-HJ-NP-Z1-9]{25,34}$/);
}

function rpcError(message, code) {
    if (!code) {
        code = -1;
    }

    return {
        code: code,
        message: message
    };
}

function getbalance(req, res, next) {
    var confirmations = parseInt(req.body.params[1]);
    req.opts = {
        confirmations: confirmations || 1
    };
    next();
}

function sendfrom(req, res, next) {
    var address = req.body.params[1];
    if (!isValidAddress(address))
        return next(rpcError('Invalid address', -8));

    var amount = parseFloat(req.body.params[2]) * Math.pow(10, 8);
    if (isNaN(amount))
        return next(rpcError('Invalid amount', -8));

    var confirmations = parseInt(req.body.params[3]);
    if (isNaN(confirmations))
        return next(rpcError('Invalid confirmations', -8));

    req.opts = {
        outputs: [{
            toAddress: address,
            amount: amount
        }],
        excludeUnconfirmedUtxos: confirmations > 0,
        message: req.body.params[4]
    };
    next();
}

function getnewaddress(req, res, next) {
    req.opts = {
        force: true
    };
    next();
}

function getreceivedbyaddress(req, res, next) {
    var address = req.body.params[0];
    if (!isValidAddress(address))
        return next(rpcError('Invalid address', -8));

    var confirmations = parseInt(req.body.params[1]);
    if (isNaN(confirmations))
        confirmations = 1;
    if (confirmations < 0)
        confirmations = 0;

    req.opts = {
        address: address,
        confirmations: confirmations
    };
    next();
}

function read(req, res, next) {
    var authorization = req.get('authorization');
    if (!authorization)
        return next(rpcError('Invalid authorization', -32600));

    var auth = req.get('authorization').split(' ')[1];
    var userPass = new Buffer(auth, 'base64').toString().split(':');
    req.password = userPass[1];

    if (!req.body)
        return next(rpcError('Invalid JSON-RPC request', -32602));
    switch (req.body.method) {
        case 'getbalance':
            return getbalance(req, res, next);
        case 'sendfrom':
            return sendfrom(req, res, next);
        case 'getreceivedbyaddress':
            return getreceivedbyaddress(req, res, next);
        case 'getnewaddress':
            return getnewaddress(req, res, next);
        default:
            req.opts = {};
            next();
    }
}

function write(req, res, next) {
    res.json({
        result: req.result,
        id: req.body.id
    });
}

function error(err, req, res, next) {
    if (typeof(err) !== 'object')
        err = rpcError(err);

    log.error(err.message);
    res.json({
        error: err,
        id: req.body.id
    });
}

module.exports = {
    read: read,
    write: write,
    error: error
};