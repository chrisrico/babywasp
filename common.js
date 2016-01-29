#!/usr/bin/env node
var fs = require('fs');
var async = require('async');
var bip39 = require('bip39');
var crypto = require('crypto')
var bitcore = require('bitcore-wallet-client');
var program = require('commander')

var Common = {};

Common.program = function () {
	return program
		.option('-v, --verbose', 'Enable verbose bitcore-wallet-client logging')
		.option('-h, --host <host>', 'URL of BitCore wallet service (default: Bitpay)', 'https://bws.bitpay.com/bws/api');
};

Common.getClient = function (walletFile, host, verbose, cb) {
	var client = new bitcore({
		baseUrl: host,
		verbose: verbose
	});

	if (!walletFile) return cb(null, client);

	async.waterfall([
		async.constant(walletFile),
		fs.readFile,
		load
	], cb);

	function load(wallet, next) {
		try {
			client.import(JSON.parse(wallet));
			client.openWallet(function (err, complete) {
				if (err) return cb(err);
				if (!complete) return cb('Wallet is unusable until all copayers have joined');
				return next(null, client);
			});
		} catch (e) {
			return next(e);
		}
	}	
};

Common.unlockWallet = function (client, password, cb) {
	try {
		client.unlock(password);
		return cb(null, client);
	} catch (e) {
		return cb(e);
	}
};

Common.saveWalletCallback = function (walletFile) {
	return function (client, secret, cb) {
		var mnemonic = bip39.generateMnemonic();
		var apiKey = crypto.createHash('sha256')
		                   .update(bip39.mnemonicToSeed(mnemonic))
		                   .digest('hex');

		try {
			client.setPrivateKeyEncryption(apiKey);						
		} catch (e) {
			return cb(e);
		}

		async.waterfall([
			async.constant(walletFile, JSON.stringify(client.export())),
			fs.writeFile,
			outputData
		], function (err) {
			return cb(err);
		});

		function outputData(next) {
			var words = mnemonic.split(' ');

			console.log('\n IMPORTANT:\n');
			console.log(' This is the mnemonic version of your wallet password. You will need it to');
			console.log(' change the wallet API key, so write it down and keep it safe.\n');
			console.log(words.slice(0, 6).join(' '));
			console.log(words.slice(6, 12).join(' ') + '\n');
			console.log(' This is your wallet API key. Put this in your BATM server configuration.\n');
			console.log(apiKey + '\n');
			if (secret) {
				console.log(' This is your Copay secret, share this with your copayers.\n');
				console.log(secret + '\n');

				process.stdout.write('  Waiting for other copayers');
				var complete = false;
				async.until(
					function () { return complete; },
					function (cb) {
						setTimeout(function () {
							process.stdout.write('.');
							client.openWallet(function (err, c) {
								complete = c;
								if (err) return cb(err);
								cb(null);
							});
						}, 250);
					},
					function (err) {
						if (err) return next(err);
						console.log('\n  Your wallet is ready to use.');
						return next();
					}
				);
			}
		}
	}
};

module.exports = Common;