// default app configuration
const port = process.env.PORT || 4000;
const tlsKeyPath = process.env.TLS_KEY_PATH;
const tlsCertPath = process.env.TLS_CERT_PATH;
let db = process.env.MONGODB_URI || "mongodb://localhost:27017/nodegoat";

module.exports = {
    port,
    db,
    tlsKeyPath,
    tlsCertPath,
    cookieSecret: "session_cookie_secret_key_here",
    cryptoKey: "a_secure_key_for_crypto_here",
    cryptoAlgo: "aes256",
    hostName: "localhost",
    environmentalScripts: []
};

