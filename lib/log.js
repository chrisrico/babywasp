require('./extensions');

module.exports = new (function () {
    var verbose = false;

    function timestamp() {
        var now = new Date();
        function pad(num) {
            return String(num).pad('0', -2)
        }
        return '{0}-{1}-{2} {3}:{4}:{5}'.format(
            now.getFullYear(),
            pad(now.getMonth() + 1),
            pad(now.getDate()),
            pad(now.getHours()),
            pad(now.getMinutes()),
            pad(now.getSeconds())
        );
    }

    function log(level, format) {
        if (level == 'debug' && !verbose) return;

        var args = Array.prototype.slice.call(arguments, 2);
        args.splice(0, 0, '[%s] %s\t' + format, level, timestamp());
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