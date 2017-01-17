module.exports = function (wallet) {
    return {
        address: require('./address')(wallet),
        balance: require('./balance')(wallet),
        send: require('./send')(wallet),
        bitcoind: require('./bitcoind')(wallet)
    };
};