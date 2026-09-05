require("dotenv").config();
const app = require("../src/app");

// Vercel runs this as a serverless function per request instead of a
// persistent server, so we export the Express app directly (no app.listen()).
module.exports = app;