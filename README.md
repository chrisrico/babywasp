# NO LONGER SUPPORTED

Copay is losing support for hardware wallets and Bitcore has gotten far too slow to make this software useful.

# babywasp

babywasp is a Bitcore wallet service proxy. It connects to the BWS instance of your choice though it defaults to Bitpay's. This makes it fully compatible with Copay, so you can import the wallet into Copay, or even create a m-of-n wallet.

When a wallet is created, it is encrypted with a random key. The key is put in your server configuration and the wallet can only be unlocked for transactions if the server sends the correct key. At creation time, the wallet's mnemonic is displayed which should be written down.

## Use cases
* 1-of-1 wallet allows babywasp to send transactions automatically. Nobody else can access the wallet (without manually importing the wallet file into Copay).

* 1-of-2 wallet allows babywasp to send transactions automatically. One other copayer can also access the wallet independently.

* 2-of-2 wallet requires the copayer to manually approve all transactions.

* Wallet without private keys allows for getting an address and balance checking, but no transactions.

## Installation

npm install -g babywasp

## Usage

First, join a wallet:

    $ babywasp join wallet.dat
    
Make sure to *write down your mnemonic*!

Next, start the proxy:

    $ babywasp start wallet.dat

By default it listens on port 7000.

If you need to restore a wallet:

    $ babywasp restore wallet.dat

This requires the current mnemonic and encrypts the wallet with a new random key.

To export a watching only copy of the wallet:

    $ babywasp export wallet.dat wallet.watchonly.dat

## Security

I recommend using a reverse proxy to serve this over a SSL connection and permit only the IPs you need to access it through your firewall.

## Examples

__TODO__

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

##License

babywasp is licensed under [GPLv3](https://raw.githubusercontent.com/chrisrico/babywasp/master/LICENSE)
