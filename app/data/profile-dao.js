/* The ProfileDAO must be constructed with a connected database object */
function ProfileDAO(db) {

    "use strict";

    /* If this constructor is called without the "new" operator, "this" points
     * to the global object. Log a warning and call it correctly. */
    if (false === (this instanceof ProfileDAO)) {
        console.log("Warning: ProfileDAO constructor called without 'new' operator");
        return new ProfileDAO(db);
    }

    const users = db.collection("users");
    const crypto = require("crypto");
    const config = require("../../config/config");
    const sensitiveFields = ["ssn", "dob", "bankAcc", "bankRouting"];
    const encryptionKey = crypto.createHash("sha256")
        .update(String(config.cryptoKey), "utf8")
        .digest();
    const encryptedPrefix = "enc:v1:";

    // Use authenticated encryption and a fresh nonce for each stored value.
    const encrypt = value => {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
        const ciphertext = Buffer.concat([
            cipher.update(JSON.stringify(value), "utf8"),
            cipher.final()
        ]);
        const envelope = Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64");
        return encryptedPrefix + envelope;
    };

    const decrypt = value => {
        // Keep existing plaintext records readable while new writes are encrypted.
        if (typeof value !== "string" || !value.startsWith(encryptedPrefix)) {
            return value;
        }
        const envelope = Buffer.from(value.slice(encryptedPrefix.length), "base64");
        if (envelope.length < 29) {
            throw new Error("Invalid encrypted profile value");
        }
        const iv = envelope.subarray(0, 12);
        const authTag = envelope.subarray(12, 28);
        const ciphertext = envelope.subarray(28);
        const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey, iv);
        decipher.setAuthTag(authTag);
        const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
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

        // Return normal profile values to the caller, but persist only encrypted
        // values for the sensitive fields.
        const storedUser = { ...user };
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
                if (user) {
                    sensitiveFields.forEach(field => {
                        if (Object.prototype.hasOwnProperty.call(user, field)) {
                            user[field] = decrypt(user[field]);
                        }
                    });
                }

                callback(null, user);
            }
        );
    };
}

module.exports = { ProfileDAO };
