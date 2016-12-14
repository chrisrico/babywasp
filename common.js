#!/usr/bin/env node
var fs = require('fs');
var async = require('async');
var crypto = require('crypto')
var bitcore = require('bitcore-wallet-client');
var program = require('commander')
var finder = require('find-package-json')(__dirname);

var Common = {
	version: finder.next().value.version
};

Common.program = function (properties) {
	program = program
		.option('-v, --verbose', 'Enable verbose bitcore-wallet-client logging')
		.option('-h, --host <url>', 'URL of BitCore wallet service (default: Bitpay)', 'https://bws.bitpay.com/bws/api');

	Object.keys(properties || {})
		.forEach(function(key) {
			var el = properties[key];
			program = program.option(el.option, el.description, el.pattern);
		});

	return program;
};

Common.getClient = function (walletFile, host, verbose, cb) {
	var client = new bitcore({
		baseUrl: host,
		logLevel: verbose ? 'debug' : 'silent'
	});

	if (!walletFile) return cb(null, client);

	async.waterfall([
		async.constant(walletFile),
		fs.readFile,
		load,
		recreate,
		scan
	], cb);

	function load(wallet, next) {
		try {
			client.import(wallet);
			client.openWallet(function (err, complete) {
				if (err) return next(err);
				if (!complete) return next('Wallet is unusable until all copayers have joined');
				return next(null, client);
			});
		} catch (e) {
			return next(e);
		}
	}

	function recreate(client, next) {
		client.recreateWallet(function (err) {
			return next(err, client);
		});
	}

	function scan(client, next) {
		client.startScan({includeCopayerBranches: true}, function (err) {
			return next(err, client);
		});
	}
};

Common.encryptWallet = function (walletFile) {
	return function (client, cb) {
		var apiKey = crypto.createHash('sha256')
			.update(crypto.randomBytes(256))
			.digest('hex');

		client.encryptPrivateKey(apiKey);

		async.waterfall([
			async.constant(walletFile, client.export()),
			fs.writeFile,
			function (next) {
				console.log('This is your wallet API key. Put this in your BATM server configuration.\n');
				console.log(apiKey + '\n');
				next();
			}
		], cb);
	}
};

module.exports = Common;