// default app configuration
const crypto = require("crypto");
const port = process.env.PORT || 4000;
let db = process.env.MONGODB_URI || "mongodb://localhost:27017/nodegoat";

module.exports = {
    port,
    db,
    // Allow deployments to supply a stable secret; otherwise create a strong
    // unpredictable secret for this process rather than relying on a default.
    cookieSecret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString("hex"),
    cryptoKey: "a_secure_key_for_crypto_here",
    cryptoAlgo: "aes256",
    hostName: "localhost",
    environmentalScripts: []
};

