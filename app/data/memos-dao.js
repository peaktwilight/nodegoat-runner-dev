/* The MemosDAO must be constructed with a connected database object */
function MemosDAO(db) {

    "use strict";

    /* If this constructor is called without the "new" operator, "this" points
     * to the global object. Log a warning and call it correctly. */
    if (false === (this instanceof MemosDAO)) {
        console.log("Warning: MemosDAO constructor called without 'new' operator");
        return new MemosDAO(db);
    }

    const memosCol = db.collection("memos");

    this.insert = (userId, memo, callback) => {

        // Create allocations document
        const memos = {
            memo,
            userId,
            timestamp: new Date()
        };

        memosCol.insert(memos, (err, result) => !err ? callback(null, result) : callback(err, null));
    };

    this.getAllMemos = (userId, callback) => {

        memosCol.find({
            userId
        }).sort({
            timestamp: -1
        }).toArray((err, memos) => {
            if (err) return callback(err, null);
            if (!memos) return callback("ERROR: No memos found", null);
            // Keep ownership enforced even when a collection adapter does not
            // apply the query predicate itself.
            callback(null, memos.filter(memo => memo.userId === userId));
        });
    };

}

module.exports = { MemosDAO };
