var bodyParser = require('body-parser');
var express = require('express');

var log = require('../lib/log');
var middleware = require('./middleware');
var router = require('./router');

function defaultLogger(req, res, next) {
    var ip = req.get('x-real-ip') || req.get('x-forwarded-for') || req.ip;
    log.info('%s\t%s %s', ip, req.method, req.path);
    next();
}

function rpcLogger(req, res, next) {
    console.log(req.body.method, req.body.params);
    next();
}

module.exports = function (options, wallet) {
    const bitcoindPort = wallet.isTestnet() ? 18332 : 8332;
    const jsonParser = bodyParser.json({type: () => true});

    log.setVerbose(options.verbose);

    var app = express();
    app.disable('x-powered-by');
    app.use(defaultLogger);
    app.get('/address', middleware.babywasp.address, router.address(wallet));
    app.get('/balance', middleware.babywasp.balance, router.balance(wallet));
    app.post('/send/:address', middleware.babywasp.send, router.send(wallet));
    app.use(middleware.babywasp.write, middleware.babywasp.error);
    app.listen(options.port, function () {
        log.info('Listening on port %s', options.port);
    });

    // bitcoind compatibility
    var bitcoind = express();
    bitcoind.disable('x-powered-by');
    bitcoind.use(defaultLogger, jsonParser, rpcLogger, middleware.bitcoind.read);
    bitcoind.post('/', router.bitcoind(wallet));
    bitcoind.use(middleware.bitcoind.write, middleware.bitcoind.error);
    bitcoind.listen(bitcoindPort, function () {
        log.info('Bitcoind JSON-RPC on port %s', bitcoindPort);
    });
};