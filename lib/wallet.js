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
    this.feeLevel = options.feeLevel || 'normal';
    this.cachedAddress = null;
}

Wallet.prototype.isTestnet = function () {
    return this.client.credentials.network == 'testnet';
};

Wallet.prototype.load = function (callback) {
    var client = this.client, file = this.file;

    async.waterfall([
        async.apply(fs.readFile, file),
        async.asyncify(client.import.bind(client)),
        // ignore undefined return value from import
        function (_, next) {
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

Wallet.prototype.getBalance = function (includeUnconfirmed, callback) {
    this.client.getBalance({twoStep: true}, function (err, balance) {
        if (err) return callback(err);
        callback(null, includeUnconfirmed ? balance.availableAmount : balance.availableConfirmedAmount);
    });
};

Wallet.prototype.send = function (opts, password, callback) {
    var client = this.client;

    if (!client.canSign()) return callback('Wallet has no private keys');
    if (!client.checkPassword(password)) return callback('Invalid API key');

    opts.feeLevel = this.feeLevel;

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
        async.apply(fs.writeFile, this.file, this.client.export()),
        function (next) {
            next(null, password);
        }
    ], callback);
};

module.exports = Wallet;