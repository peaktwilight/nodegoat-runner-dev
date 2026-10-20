const crypto = require("crypto");

// default app configuration
const port = process.env.PORT || 4000;
let db = process.env.MONGODB_URI || "mongodb://localhost:27017/nodegoat";

module.exports = {
    port,
    db,
    // Set COOKIE_SECRET to a stable, high-entropy value in deployed environments.
    // Generate a strong per-process secret when one is not provided (e.g. local development).
    cookieSecret: process.env.COOKIE_SECRET || crypto.randomBytes(32).toString("hex"),
    cryptoKey: "a_secure_key_for_crypto_here",
    cryptoAlgo: "aes256",
    hostName: "localhost",
    environmentalScripts: []
};

