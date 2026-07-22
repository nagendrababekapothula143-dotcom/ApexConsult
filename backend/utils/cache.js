const NodeCache = require("node-cache");

// stdTTL: time to live in seconds for every generated cache element. (15 minutes default)
// checkperiod: period in seconds, used for the automatic delete check interval.
const cache = new NodeCache({ stdTTL: 900, checkperiod: 120 });

module.exports = cache;
