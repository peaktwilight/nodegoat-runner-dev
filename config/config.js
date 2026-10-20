const _ = require("underscore");
const path = require("path");
const util = require("util");

const finalEnv = process.env.NODE_ENV || "development";

const allConf = require(path.resolve(__dirname + "/../config/env/all.js"));
const envConf = require(path.resolve(__dirname + "/../config/env/" + finalEnv.toLowerCase() + ".js")) || {};

const config = { ...allConf, ...envConf };

console.log(`Current Config:`);
// Configuration is logged for debugging, but signing secrets must never be logged.
console.log(util.inspect({ ...config, cookieSecret: "[REDACTED]" }, false, null));

module.exports = config;
