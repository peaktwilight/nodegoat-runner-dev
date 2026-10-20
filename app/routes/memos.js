const MemosDAO = require("../data/memos-dao").MemosDAO;
const marked = require("marked");
const renderer = new marked.Renderer();
const originalLink = renderer.link;
renderer.link = function (href, title, text) {
    let normalizedHref;
    try {
        normalizedHref = decodeURIComponent(href).replace(/[\u0000-\u0020\u007f]/g, "").toLowerCase();
    } catch (err) {
        return text;
    }
    const scheme = normalizedHref.match(/^([a-z][a-z0-9+.-]*):/);
    if ((scheme && !/^(https?|mailto)$/.test(scheme[1])) || /^[^/?#]*&/.test(normalizedHref)) return text;
    return originalLink.call(this, href, title, text);
};
marked.setOptions({ renderer: renderer });
const {
    environmentalScripts
} = require("../../config/config");

function MemosHandler(db) {
    "use strict";

    const memosDAO = new MemosDAO(db);

    this.addMemos = (req, res, next) => {

        memosDAO.insert(req.body.memo, (err, docs) => {
            if (err) return next(err);
            this.displayMemos(req, res, next);
        });
    };

    this.displayMemos = (req, res, next) => {

        const {
            userId
        } = req.session;

        memosDAO.getAllMemos((err, docs) => {
            if (err) return next(err);
            return res.render("memos", {
                memosList: docs,
                userId: userId,
                environmentalScripts
            });
        });
    };

}

module.exports = MemosHandler;
