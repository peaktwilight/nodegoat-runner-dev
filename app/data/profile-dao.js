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
    const sensitiveFields = ["ssn", "dob", "bankAcc", "bankRouting", "address"];
    // Use a fixed-size encryption key and a fresh IV for every stored value.
    const encryptionKey = crypto.createHash("sha256").update(config.cryptoKey, "utf8").digest();

    const encrypt = value => {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
        const ciphertext = Buffer.concat([
            cipher.update(JSON.stringify(value), "utf8"),
            cipher.final()
        ]);
        return `enc:v1:${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${ciphertext.toString("hex")}`;
    };

    const decrypt = value => {
        if (typeof value !== "string" || value.indexOf("enc:v1:") !== 0) {
            // Continue to support profile records written before encryption.
            return value;
        }
        const parts = value.split(":");
        if (parts.length !== 5) throw new Error("Invalid encrypted profile value");
        const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey, Buffer.from(parts[2], "hex"));
        decipher.setAuthTag(Buffer.from(parts[3], "hex"));
        const plaintext = Buffer.concat([
            decipher.update(Buffer.from(parts[4], "hex")),
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
        if (bankAcc) user.bankAcc = bankAcc;
        if (bankRouting) user.bankRouting = bankRouting;
        if (ssn) user.ssn = ssn;
        if (dob) user.dob = dob;

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
                    try {
                        sensitiveFields.forEach(field => {
                            if (Object.prototype.hasOwnProperty.call(user, field)) {
                                user[field] = decrypt(user[field]);
                            }
                        });
                    } catch (decryptError) {
                        return callback(decryptError, null);
                    }
                }
                callback(null, user);
            }
        );
    };
}

module.exports = { ProfileDAO };
