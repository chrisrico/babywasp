var bodyParser = require('body-parser');
var express = require('express');

var log = require('../lib/log');
var middleware = require('./middleware');
var router = require('./router');

module.exports = function (options, wallet) {
    log.setVerbose(options.verbose);

    var app = express();

    app.use(function (req, res, next) {
        var ip = req.get('x-real-ip') || req.get('x-forwarded-for') || req.ip;
        log.info('%s\t%s %s', ip, req.method, req.originalUrl);
        next();
    });

    app.get('/address', router.address(wallet, function (address) {
        return address;
    }));
    app.get('/balance', router.balance(wallet));
    app.post('/send/:address', middleware.babywasp, setFeeLevel, router.send(wallet));

    // bitcoind compatibility
    app.post('/', bodyParser.json(), middleware.bitcoind, setFeeLevel, router.bitcoind(wallet));

    app.use(function (err, req, res, next) {
        //if (err) throw new Error(err);
        if (res.headersSent) return next(err);
        log.error(err);
        res.sendStatus(500);
    });

    app.set('x-powered-by', false);
    app.listen(options.port, function () {
        log.info('Listening on port %s', options.port);
    });

    function setFeeLevel(req, res, next) {
        req.body.feeLevel = options.feeLevel;
        next();
    }
};