const mongoose = require("mongoose");

// Mongoose propagates the transaction session to queries, saves, creates and
// populated queries in this async context, including audit/notification helpers.
mongoose.set("transactionAsyncLocalStorage", true);

function transactional(handler) {
  return async (req, res, next) => {
    if (mongoose.transactionAsyncLocalStorage.getStore()?.session) return handler(req, res, next);
    let response;
    try {
      await mongoose.connection.transaction(async () => {
        response = { status: 200 };
        const pendingResponse = {
          status(code) { response.status = code; return this; },
          json(body) { response.body = body; return this; },
        };
        await handler(req, pendingResponse, next);
        if (!response.body || response.status >= 400) {
          const error = new Error(response.body?.message || "Operation returned no result.");
          error.response = response;
          throw error;
        }
      });
      return res.status(response.status).json(response.body);
    } catch (error) {
      if (error.response?.body) return res.status(error.response.status).json(error.response.body);
      const status = error.code === 11000 || error.name === "VersionError" ? 409
        : ["ValidationError", "CastError"].includes(error.name) ? 400 : 503;
      return res.status(status).json({ message: status === 409 ? "The record changed or already exists. Refresh and try again." : "Database transaction failed; no changes were saved.", error: error.message });
    }
  };
}

module.exports = { transactional };
