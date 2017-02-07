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

function start(port, callback) {
    var app = express();
    app.disable('x-powered-by');
    app.use(defaultLogger);
    callback(app);

    var message = [8332, 18332].indexOf(port) >= 0 ? 'Bitcoin JSON-RPC' : 'Listening';
    app.listen(port, () => log.info('%s on port %s', message, port))
}

module.exports = function (options, wallet) {
    log.setVerbose(options.verbose);

    var middleware = require('./middleware')(wallet);
    var router = require('./router')(wallet);

    start(options.port, function (app) {
        var m = middleware.babywasp;
        app.get('/address', m.address, router.address);
        app.get('/balance', m.balance, router.balance);
        app.get('/addresses', (req, res, next) => {
            res.json(wallet.unusedAddresses);
        });
        app.post('/send/:address', m.send, router.send);
        app.use(m.write, m.error);
    });

    // bitcoind compatibility
    start(wallet.isTestnet() ? 18332 : 8332, function (app) {
        var m = middleware.bitcoind;
        app.use(jsonParser, rpcLogger, m.read);
        app.post('/', router.bitcoind);
        app.use(m.write, m.error);
    });
};