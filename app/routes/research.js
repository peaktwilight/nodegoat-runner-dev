const ResearchDAO = require("../data/research-dao").ResearchDAO;
const needle = require("needle");
const researchUrl = "https://finance.yahoo.com/quote/";
const {
    environmentalScripts
} = require("../../config/config");

function ResearchHandler(db) {
    "use strict";

    const researchDAO = new ResearchDAO(db);

    this.displayResearch = (req, res) => {

        if (req.query.symbol) {
            const symbol = req.query.symbol;

            // The research endpoint is fixed; do not allow the caller to make
            // the server fetch an arbitrary URL. Keep the form's existing URL
            // parameter only when it matches that endpoint.
            if ((req.query.url !== undefined && req.query.url !== researchUrl) ||
                typeof symbol !== "string" || !/^[A-Za-z0-9.^_-]{1,20}$/.test(symbol)) {
                res.writeHead(400);
                return res.end();
            }

            const url = researchUrl + encodeURIComponent(symbol);
            return needle.get(url, (error, newResponse, body) => {
                if (!error && newResponse.statusCode === 200) {
                    res.writeHead(200, {
                        "Content-Type": "text/html"
                    });
                }
                res.write("<h1>The following is the stock information you requested.</h1>\n\n");
                res.write("\n\n");
                if (body) {
                    res.write(body);
                }
                return res.end();
            });
        }

        return res.render("research", {
            environmentalScripts
        });
    };

}

module.exports = ResearchHandler;
