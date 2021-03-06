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
}

Wallet.prototype.isTestnet = function () {
    return this.client.credentials.network == 'testnet';
};

Wallet.prototype.load = function (opts, callback) {
    if (typeof(opts) === 'function') {
        callback = opts;
        opts = {};
    }

    var self = this, client = this.client;

    function handleNotification(notification) {
        if (notification.type == 'NewIncomingTx') {
            tryRemoveAddress(self.unusedAddresses, notification.data.address);
        }
    }

    function gatherWalletData(next) {
        if (!opts.addressScan) return next(null, [], []);

        async.parallel([
            self.getTxHistory.bind(self),
            client.getMainAddresses.bind(client, {})
        ], (err, results) => next(err, results[0], results[1].map(a => a.address)));
    }

    async.waterfall([
        async.apply(fs.readFile, self.file),
        async.asyncify(client.import.bind(client)),
        // ignore undefined return value from import
        (_, next) => next(),
        client.openWallet.bind(client),
        (complete, next) => next(complete ? null : 'Wallet is unusable until all copayers have joined'),
        client.recreateWallet.bind(client),
        client.startScan.bind(client, {includeCopayerBranches: true}),
        next => opts.addressScan ? client.initialize({}, next) : next(),
        gatherWalletData,
        findUnusedAddresses,
        function (addresses, next) {
            self.unusedAddresses = addresses;
            self.client.on('notification', handleNotification);
            next();
        }
    ], callback);
};

function findUnusedAddresses(txs, addresses, callback) {
    txs.forEach(function (tx) {
        if (tx.action != 'received') return;

        tx.outputs.forEach(function (output) {
            tryRemoveAddress(addresses, output.address);
        });
    });
    callback(null, addresses);
}

function tryRemoveAddress(addresses, address) {
    var index = addresses.indexOf(address);
    if (index >= 0) {
        addresses.splice(index, 1);
    }
}

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
    var self = this;

    if (force || self.unusedAddresses.length < 10) {
        self.client.createAddress({ignoreMaxGap: true}, function (err, address) {
            if (err) return callback(err);
            self.unusedAddresses.push(address.address);
            callback(null, address.address);
        });
    } else {
        var address = self.unusedAddresses.shift();
        self.unusedAddresses.push(address);
        callback(null, address);
    }
};

Wallet.prototype.getBalance = function (includeUnconfirmed, callback) {
    this.client.getBalance({twoStep: true}, function (err, balance) {
        if (err) return callback(err);
        callback(null, includeUnconfirmed ? balance.availableAmount : balance.availableConfirmedAmount);
    });
};

Wallet.prototype.getTxHistory = function (skip, limit, buffer, callback) {
    if (typeof(skip) === 'function') {
        callback = skip;
        skip = 0;
        limit = 50;
        buffer = [];
    }

    var self = this;
    this.client.getTxHistory({skip: skip, limit: limit}, function (err, txs) {
        if (err) return callback(err);
        buffer = buffer.concat(txs);
        if (txs.length < limit) return callback(null, buffer);
        self.getTxHistory(skip + limit, limit, buffer, callback);
    });
};

Wallet.prototype.send = function (opts, password, callback) {
    var client = this.client;

    if (!client.canSign()) return callback('Wallet has no private keys');

    opts.feeLevel = this.feeLevel;

    async.waterfall([
        client.createTxProposal.bind(client, opts),
        (txp, next) => client.publishTxProposal({txp: txp}, next),
        (txp, next) => client.signTxProposal(txp, password, next),
        client.broadcastTxProposal.bind(client)
    ], callback);

};

Wallet.prototype.setNote = function (txid, note, callback) {
    this.client.editTxNote({txid: txid, body: note}, function (err, note) {
        callback(err);
    });
};

Wallet.prototype.encrypt = function (callback) {
    var password = crypto.createHash('sha256')
        .update(crypto.randomBytes(256))
        .digest('hex');

    this.client.clearMnemonic();
    this.client.encryptPrivateKey(password);

    fs.writeFile(this.file, this.client.export(), function(err) {
        callback(err, password);
    });
};

module.exports = Wallet;