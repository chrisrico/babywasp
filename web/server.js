const jsonParser = require('body-parser').json({type: () => true});
const express = require('express');

const log = require('../lib/log');

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
    log.setVerbose(options.verbose);

    var middleware = require('./middleware')(wallet);
    var router = require('./router')(wallet);

    var app = express();
    app.disable('x-powered-by');
    app.use(defaultLogger);
    app.get('/address', middleware.babywasp.address, router.address);
    app.get('/balance', middleware.babywasp.balance, router.balance);
    app.post('/send/:address', middleware.babywasp.send, router.send);
    app.use(middleware.babywasp.write, middleware.babywasp.error);
    app.listen(options.port, function () {
        log.info('Listening on port %s', options.port);
    });

    // bitcoind compatibility
    var bitcoind = express();
    bitcoind.disable('x-powered-by');
    bitcoind.use(defaultLogger, jsonParser, rpcLogger, middleware.bitcoind.read);
    bitcoind.post('/', router.bitcoind);
    bitcoind.use(middleware.bitcoind.write, middleware.bitcoind.error);

    var port = wallet.isTestnet() ? 18332 : 8332;
    bitcoind.listen(port, function () {
        log.info('Bitcoind JSON-RPC on port %s', port);
    });
};