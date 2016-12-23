if (!String.prototype.format) {
    String.prototype.format = function() {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function(match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
                : match
                ;
        });
    };
}

if (!String.prototype.pad) {
    String.prototype.pad = function (char, length) {
        if (length == 0) return this;
        var absolute = Math.abs(length);
        var padding = char.repeat(absolute);
        return length < 0
            ? (padding + this).slice(length)
            : (this + padding).substring(0, absolute);
    };
}

module.exports = {};