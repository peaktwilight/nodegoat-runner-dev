const ContributionsDAO = require("../data/contributions-dao").ContributionsDAO;
const url = require("url");
const {
    environmentalScripts
} = require("../../config/config");

/* The ContributionsHandler must be constructed with a connected db */
function ContributionsHandler(db) {
    "use strict";

    const contributionsDAO = new ContributionsDAO(db);

    this.displayContributions = (req, res, next) => {
        const {
            userId
        } = req.session;

        contributionsDAO.getByUserId(userId, (error, contrib) => {
            if (error) return next(error);

            contrib.userId = userId; //set for nav menu items
            return res.render("contributions", {
                ...contrib,
                environmentalScripts
            });
        });
    };

    this.handleContributionsUpdate = (req, res, next) => {

        // Reject form submissions initiated by another origin. Browsers send an
        // Origin header for cross-origin POST requests; older clients may use
        // Referer instead. Leave requests without either header compatible with
        // existing non-browser clients.
        const requestOrigin = req.get("origin") || req.get("referer");
        if (requestOrigin) {
            const parsedOrigin = url.parse(requestOrigin);
            const requestHost = req.get("host");
            if (!parsedOrigin.host || !requestHost ||
                parsedOrigin.host.toLowerCase() !== requestHost.toLowerCase() ||
                parsedOrigin.protocol !== `${req.protocol}:`) {
                return res.status(403).send("Cross-origin contribution update rejected");
            }
        }

        /*jslint evil: true */
        // Insecure use of eval() to parse inputs
        const preTax = eval(req.body.preTax);
        const afterTax = eval(req.body.afterTax);
        const roth = eval(req.body.roth);

        /*
        //Fix for A1 -1 SSJS Injection attacks - uses alternate method to eval
        const preTax = parseInt(req.body.preTax);
        const afterTax = parseInt(req.body.afterTax);
        const roth = parseInt(req.body.roth);
        */
        const {
            userId
        } = req.session;

        //validate contributions
        const validations = [isNaN(preTax), isNaN(afterTax), isNaN(roth), preTax < 0, afterTax < 0, roth < 0];
        const isInvalid = validations.some(validation => validation);
        if (isInvalid) {
            return res.render("contributions", {
                updateError: "Invalid contribution percentages",
                userId,
                environmentalScripts
            });
        }
        // Prevent more than 30% contributions
        if (preTax + afterTax + roth > 30) {
            return res.render("contributions", {
                updateError: "Contribution percentages cannot exceed 30 %",
                userId,
                environmentalScripts
            });
        }

        contributionsDAO.update(userId, preTax, afterTax, roth, (err, contributions) => {

            if (err) return next(err);

            contributions.updateSuccess = true;
            return res.render("contributions", {
                ...contributions,
                environmentalScripts
            });
        });

    };

}

module.exports = ContributionsHandler;
