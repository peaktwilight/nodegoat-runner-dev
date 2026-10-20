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
    const config = require("../../config/env/all");
    // Use authenticated encryption and a fresh IV for every sensitive value.
    const encryptionKey = crypto.scryptSync(config.cryptoKey, "nodegoat-profile-data-v1", 32);
    const sensitiveFields = ["ssn", "dob", "address", "bankAcc", "bankRouting"];

    const encrypt = value => {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
        const ciphertext = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
        return {
            _profileEncrypted: 1,
            iv: iv.toString("hex"),
            tag: cipher.getAuthTag().toString("hex"),
            data: ciphertext.toString("hex")
        };
    };

    const decrypt = value => {
        // Keep existing plaintext records readable; updates encrypt them.
        if (!value || value._profileEncrypted !== 1) return value;
        const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey, Buffer.from(value.iv, "hex"));
        decipher.setAuthTag(Buffer.from(value.tag, "hex"));
        return Buffer.concat([
            decipher.update(Buffer.from(value.data, "hex")),
            decipher.final()
        ]).toString("utf8");
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

                const profileUser = user && Object.assign({}, user);
                if (profileUser) {
                    sensitiveFields.forEach(field => {
                        if (Object.prototype.hasOwnProperty.call(profileUser, field)) {
                            profileUser[field] = decrypt(profileUser[field]);
                        }
                    });
                }

                callback(null, profileUser);
            }
        );
    };
}

module.exports = { ProfileDAO };
