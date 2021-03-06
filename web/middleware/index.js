var bitcoinAddress = require('bitcoin-address');
var addressTypeMap = {
    livenet: 'prod',
    testnet: 'testnet'
};

module.exports = function (wallet) {
    function addressValidator(address) {
        var type = addressTypeMap[wallet.client.credentials.network];
        return bitcoinAddress.validate(address, type);
    }

    function passwordValidator (password) {
        return wallet.client.checkPassword(password);
    }

    return {
        babywasp: require('./babywasp')(addressValidator),
        bitcoind: require('./bitcoind')(addressValidator, passwordValidator)
    }
};