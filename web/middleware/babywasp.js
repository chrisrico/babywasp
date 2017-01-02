var log = require('../../lib/log');

function send(req, res, next) {
    req.password = req.get('x-api-key');
    req.opts = {
        outputs: [{
            toAddress: req.params.address,
            amount: parseInt(req.query.amount)
        }], message: req.query.description
    };
    next();
}

function balance(req, res, next) {
    req.opts = {
        includeUnconfirmed: true
    };
    next();
}

function address(req, res, next) {
    req.opts = {
        force: req.query.force == 'true'
    };
    next();
}

function write(req, res, next) {
    res.json(req.result);
}

function error(err, req, res, next) {
    log.error(err);
    res.sendStatus(500);
}

module.exports = {
    send: send,
    address: address,
    balance: balance,
    write: write,
    error: error
};