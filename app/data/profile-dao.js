/* The ProfileDAO must be constructed with a connected database object */
const crypto = require("crypto");

function ProfileDAO(db) {

    "use strict";

    /* If this constructor is called without the "new" operator, "this" points
     * to the global object. Log a warning and call it correctly. */
    if (false === (this instanceof ProfileDAO)) {
        console.log("Warning: ProfileDAO constructor called without 'new' operator");
        return new ProfileDAO(db);
    }

    const users = db.collection("users");
    const config = require("../../config/config");
    const sensitiveFields = ["ssn", "dob", "address", "bankAcc", "bankRouting"];
    const encryptedPrefix = "enc:v1:";
    if (typeof config.cryptoKey !== "string" || config.cryptoKey.length === 0) {
        throw new Error("A profile-data encryption key must be configured");
    }
    const encryptionKey = crypto.scryptSync(config.cryptoKey, "nodegoat-profile-data-v1", 32);

    // AES-GCM authenticates each value as well as encrypting it. Keep the IV
    // alongside each ciphertext; it must be unique for each encryption.
    const encrypt = value => {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
        const ciphertext = Buffer.concat([
            cipher.update(JSON.stringify(value), "utf8"),
            cipher.final()
        ]);
        const payload = Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
        return encryptedPrefix + payload.toString("base64");
    };

    const decrypt = value => {
        if (typeof value !== "string" || value.indexOf(encryptedPrefix) !== 0) {
            throw new Error("Invalid encrypted profile value");
        }
        const payload = Buffer.from(value.slice(encryptedPrefix.length), "base64");
        if (payload.length < 28) {
            throw new Error("Invalid encrypted profile value");
        }
        const iv = payload.slice(0, 12);
        const authTag = payload.slice(12, 28);
        const ciphertext = payload.slice(28);
        const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey, iv);
        decipher.setAuthTag(authTag);
        const plaintext = Buffer.concat([
            decipher.update(ciphertext),
            decipher.final()
        ]).toString("utf8");
        return JSON.parse(plaintext);
    };

    this.updateUser = (userId, firstName, lastName, ssn, dob, address, bankAcc, bankRouting, callback) => {

        // Create user document
        const user = {};
        if (firstName) {
            user.firstName = firstName;
        }
        if (lastName) {
            user.lastName = lastName;
        }
        if (address) {
            user.address = address;
        }
        if (bankAcc) {
            user.bankAcc = bankAcc;
        }
        if (bankRouting) {
            user.bankRouting = bankRouting;
        }
        if (ssn) {
            user.ssn = ssn;
        }
        if (dob) {
            user.dob = dob;
        }

        const storedUser = Object.assign({}, user);
        sensitiveFields.forEach(field => {
            if (Object.prototype.hasOwnProperty.call(storedUser, field)) {
                storedUser[field] = encrypt(storedUser[field]);
            }
        });

        users.update({
                _id: parseInt(userId)
            }, {
                $set: storedUser
            },
            err => {
                if (!err) {
                    console.log("Updated user profile");
                    return callback(null, user);
                }

                return callback(err, null);
            }
        );
    };

    this.getByUserId = (userId, callback) => {
        users.findOne({
                _id: parseInt(userId)
            },
            (err, user) => {
                if (err) return callback(err, null);
                if (!user) return callback(null, null);

                const legacyValues = {};
                try {
                    sensitiveFields.forEach(field => {
                        if (!Object.prototype.hasOwnProperty.call(user, field) || user[field] === null ||
                            typeof user[field] === "undefined") {
                            return;
                        }
                        if (typeof user[field] === "string" && user[field].indexOf(encryptedPrefix) === 0) {
                            user[field] = decrypt(user[field]);
                        } else {
                            // Migrate records written before encryption was enabled.
                            legacyValues[field] = encrypt(user[field]);
                        }
                    });
                } catch (decryptError) {
                    return callback(decryptError, null);
                }

                if (Object.keys(legacyValues).length === 0) {
                    return callback(null, user);
                }

                users.update({
                        _id: parseInt(userId)
                    }, {
                        $set: legacyValues
                    },
                    migrationError => {
                        if (migrationError) return callback(migrationError, null);
                        callback(null, user);
                    }
                );
            }
        );
    };
}

module.exports = { ProfileDAO };
