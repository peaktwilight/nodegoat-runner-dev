// Error handling middleware

const errorHandler = (err, req, res,next) => {

    "use strict";

    console.error(err.message);
    console.error(err.stack);
    // A missing or invalid CSRF token is a forbidden request, not an app error.
    res.status(err.code === "EBADCSRFTOKEN" ? 403 : 500);
    res.render("error-template", {
        error: err
    });
};

module.exports = { errorHandler };
