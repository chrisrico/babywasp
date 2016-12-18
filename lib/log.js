module.exports = new (function () {
    var verbose = false;

    function log(level, format) {
        if (level == 'debug' && !verbose) return;

        var ts = new Date().toISOString().slice(0, 19);

        var args = Array.prototype.slice.call(arguments, 2);
        args.splice(0, 0, '[%s] %s\t' + format, level, ts);
        console.log.apply(console, args);
    }

    log.info = log.bind(null, 'info');
    log.debug = log.bind(null, 'debug');
    log.error = log.bind(null, 'error');

    log.setVerbose = function (_verbose) {
        verbose = _verbose;
    };

    return log;
})();