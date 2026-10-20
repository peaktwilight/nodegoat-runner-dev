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
    const encryptionKey = crypto.createHash("sha256").update(String(config.cryptoKey), "utf8").digest();
    const encryptedPrefix = "enc:v1:";
    const sensitiveFields = ["ssn", "dob", "address", "bankAcc", "bankRouting"];

    const encrypt = value => {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
        const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
        const tag = cipher.getAuthTag();
        return encryptedPrefix + [iv.toString("hex"), tag.toString("hex"), ciphertext.toString("hex")].join(":");
    };

    const decrypt = value => {
        if (typeof value !== "string" || value.indexOf(encryptedPrefix) !== 0) return value;
        const [ivHex, tagHex, ciphertextHex] = value.slice(encryptedPrefix.length).split(":");
        if (!ivHex || !tagHex || !ciphertextHex) throw new Error("Invalid encrypted profile value");
        const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey, Buffer.from(ivHex, "hex"));
        decipher.setAuthTag(Buffer.from(tagHex, "hex"));
        return JSON.parse(Buffer.concat([decipher.update(Buffer.from(ciphertextHex, "hex")), decipher.final()]).toString("utf8"));
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
