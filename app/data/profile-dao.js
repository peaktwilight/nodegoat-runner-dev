const crypto = require("crypto");
const config = require("../../config/config");

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

    // Encrypt sensitive profile values with authenticated encryption. A fresh
    // nonce is used for every value; the tag detects database-side tampering.
    const encryptionKey = crypto.createHash("sha256").update(String(config.cryptoKey)).digest();
    const encryptedPrefix = "enc:v1:";
    const sensitiveFields = ["ssn", "dob", "bankAcc", "bankRouting"];

    const encrypt = value => {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
        const ciphertext = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
        const tag = cipher.getAuthTag();
        return encryptedPrefix + [iv, tag, ciphertext].map(part => part.toString("hex")).join(":");
    };

    const decrypt = value => {
        if (typeof value !== "string" || value.indexOf(encryptedPrefix) !== 0) {
            // Preserve access to profile values persisted before encryption.
            return value;
        }
        const parts = value.slice(encryptedPrefix.length).split(":");
        if (parts.length !== 3) throw new Error("Invalid encrypted profile value");
        const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey, Buffer.from(parts[0], "hex"));
        decipher.setAuthTag(Buffer.from(parts[1], "hex"));
        return Buffer.concat([decipher.update(Buffer.from(parts[2], "hex")), decipher.final()]).toString("utf8");
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
        if (bankAcc) user.bankAcc = bankAcc;
        if (bankRouting) user.bankRouting = bankRouting;
        if (ssn) user.ssn = ssn;
        if (dob) user.dob = dob;

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
                if (!user) return callback(null, user);

                const profile = Object.assign({}, user);
                try {
                    sensitiveFields.forEach(field => {
                        if (Object.prototype.hasOwnProperty.call(profile, field)) {
                            profile[field] = decrypt(profile[field]);
                        }
                    });
                } catch (decryptErr) {
                    return callback(decryptErr, null);
                }
                callback(null, profile);
            }
        );
    };
}

module.exports = { ProfileDAO };
