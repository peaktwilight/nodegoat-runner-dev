const _ = require("underscore");
const path = require("path");
const util = require("util");

const finalEnv = process.env.NODE_ENV || "development";

const allConf = require(path.resolve(__dirname + "/../config/env/all.js"));
const envConf = require(path.resolve(__dirname + "/../config/env/" + finalEnv.toLowerCase() + ".js")) || {};

const config = { ...allConf, ...envConf };

console.log(`Current Config:`);
// Do not disclose the session signing key in application logs.
const logConfig = { ...config, cookieSecret: "[REDACTED]" };
console.log(util.inspect(logConfig, false, null));

module.exports = config;
