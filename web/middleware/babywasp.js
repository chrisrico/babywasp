const log = require('../../lib/log');

module.exports = function (addressValidator) {
    function send(req, res, next) {
        var address = req.params.address;
        if (!addressValidator(address)) return next('Invalid address');

        var amount = parseInt(req.query.amount);
        if (isNaN(amount)) return next('Invalid amount');

        req.password = req.get('x-api-key');
        req.opts = {
            outputs: [{
                toAddress: address,
                amount: amount
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
        if ('result' in req) {
            res.json(req.result);
        } else {
            res.sendStatus(404);
        }
    }

    function error(err, req, res, next) {
        log.error(err);
        res.sendStatus(500);
    }

    return {
        send: send,
        address: address,
        balance: balance,
        write: write,
        error: error
    };
};