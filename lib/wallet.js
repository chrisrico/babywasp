var fs = require('fs');
var async = require('async');
var bitcore = require('bitcore-wallet-client');
var crypto = require('crypto');

function Wallet(file, options) {
    this.file = file;
    this.client = new bitcore({
        baseUrl: options.host,
        logLevel: options.verbose ? 'debug' : 'silent'
    });
    this.cachedAddress = null;
}

Wallet.prototype.load = function (callback) {
    var client = this.client, file = this.file;

    async.waterfall([
        function (next) {
            fs.exists(file, function (exists) {
                next(exists ? null : 'Wallet file not found', file);
            });
        },
        fs.readFile,
        function (json, next) {
            try {
                client.import(json);
            } catch (e) {
                return next(e);
            }
            next();
        },
        client.openWallet.bind(client),
        function (complete, next) {
            next(complete ? null : 'Wallet is unusable until all copayers have joined');
        },
        client.recreateWallet.bind(client),
        client.startScan.bind(client, {includeCopayerBranches: true})
    ], callback);
};

Wallet.prototype.seedFromRandom = function (network, language) {
    this.client.seedFromRandomWithMnemonic({network: network, language: language});
};

Wallet.prototype.seedFromMnemonic = function (mnemonic, network) {
    this.client.seedFromMnemonic(mnemonic, {network: network});
};

Wallet.prototype.join = function (secret, copayer, callback) {
    this.client.joinWallet(secret, copayer, callback);
};

Wallet.prototype.getAddress = function (force, callback) {
    var wallet = this;
    var create = this.client.createAddress.bind(this.client, {}, function (err, address) {
        if (err) return callback(err);
        wallet.cachedAddress = address.address;
        callback(null, wallet.cachedAddress);
    });

    if (!this.cachedAddress || force) return create();

    this.client.getUtxos({addresses: [this.cachedAddress]}, function (err, utxos) {
        if (err) return callback(err);
        if (utxos.length > 0) return create();
        callback(null, wallet.cachedAddress);
    });

};

Wallet.prototype.getBalance = function (callback) {
    this.client.getBalance({twoStep: true}, function (err, balance) {
        if (err) return callback(err);
        callback(null, balance.availableAmount);
    });
};

Wallet.prototype.send = function (opts, password, callback) {
    var client = this.client;

    if (!client.canSign()) return callback('Wallet has no private keys');
    if (!client.checkPassword(password)) return callback('Invalid API key');

    async.waterfall([
        client.createTxProposal.bind(client, opts),
        function (txp, next) {
            client.publishTxProposal({txp: txp}, next);
        },
        function (txp, next) {
            client.signTxProposal(txp, password, next);
        },
        client.broadcastTxProposal.bind(client)
    ], callback);

};

Wallet.prototype.encrypt = function (callback) {
    var password = crypto.createHash('sha256')
        .update(crypto.randomBytes(256))
        .digest('hex');

    this.client.clearMnemonic();
    this.client.encryptPrivateKey(password);

    async.waterfall([
        async.constant(this.file, this.client.export()),
        fs.writeFile,
        function (next) {
            next(null, password);
        }
    ], callback);
};

module.exports = Wallet;