#!/usr/bin/env node

var finder = require('find-package-json')(__dirname);
var program = require('commander');
var prompt = require('prompt');
var monkeypatch = require('monkeypatch');

var log = require('./log');
var Wallet = require('./wallet');

var Util = {
	version: finder.next().value.version
};

Util.init = function (prompts, callback) {
	if (callback == null) {
		callback = prompts;
		prompts = null;
	}

	monkeypatch(program, 'parse', function (original, argv) {
		if (!argv.length) this.help();
		return original(argv);
	});

	return program
		.option('-v, --verbose', 'Enable verbose bitcore-wallet-client logging')
		.option('-H, --host <url>', 'URL of BitCore wallet service (default: Bitpay)', 'https://bws.bitpay.com/bws/api')
		.arguments('<wallet-file>')
		.action(function (walletFile) {
			var args = [].slice.call(arguments, 1, -1);
			var options = this;
			var wallet = new Wallet(walletFile, options);

			log.setVerbose(options.verbose);

			prompt.start();
			prompt.get({properties: prompts || {}}, function (err, input) {
				if (err) return;
				callback.apply(null, args.concat([options, wallet, input]));
			});
		});
};

module.exports = Util;