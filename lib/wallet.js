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
    this.unusedAddresses = [];
}

Wallet.prototype.isTestnet = function () {
    return this.client.credentials.network == 'testnet';
};

Wallet.prototype.load = function (callback) {
    var self = this, client = this.client;

    async.waterfall([
        async.apply(fs.readFile, self.file),
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
        client.startScan.bind(client, {includeCopayerBranches: true}),
        client.initialize.bind(client, {}),
        client.getMainAddresses.bind(client, {}),
        function (addresses, next) {
            getHistory(client, 0, 50, [], function (err, txs) {
                next(err, addresses.map(a => a.address), txs);
            });
        },
        findUnusedAddresses,
        function (addresses, next) {
            self.unusedAddresses = addresses;
            self.client.on('notification', self.onNotification.bind(self));
            next();
        }
    ], callback);
};

function getHistory(client, skip, limit, buffer, callback) {
    client.getTxHistory({skip: skip, limit: limit}, function (err, txs) {
        if (err) return callback(err);
        buffer = buffer.concat(txs);
        if (txs.length < limit) return callback(null, buffer);
        getHistory(client, skip + limit, limit, buffer, callback);
    });
}

function findUnusedAddresses(addresses, txs, callback) {
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

Wallet.prototype.onNotification = function (notification) {
    switch (notification.type) {
        case 'NewIncomingTx':
            tryRemoveAddress(this.unusedAddresses, notification.data.address);
            break;
    }
};

Wallet.prototype.getAddress = function (force, callback) {
    var self = this;

    if (force || self.unusedAddresses.length == 0) {
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