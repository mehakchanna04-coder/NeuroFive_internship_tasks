require('dotenv').config();
const connectDB = require('../config/db');
const app = require('../app');
const logger = require('../utils/logger');

/**
 * Entry point Vercel actually calls (see vercel.json, which rewrites every
 * path to this function). A serverless platform gives each request its own
 * short-lived invocation rather than one long-running process, so instead
 * of connecting once at startup (like server.js does for a traditional
 * host), we connect defensively on every invocation.
 *
 * This is cheap in practice: connectDB() checks mongoose's connection
 * state first and returns immediately if a connection from a previous
 * "warm" invocation is still open, so most requests skip straight to the
 * Express app without waiting on a fresh connection.
 */
module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (err) {
    // connectDB() throws instead of exiting when running on Vercel (see
    // config/db.js) -- this is the one place that catches that and turns
    // it into a clean response instead of an unhandled invocation error.
    logger.error({ err: err.message }, 'Database unavailable for this invocation');
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: 'Database unavailable, please try again shortly' }));
    return;
  }

  return app(req, res);
};
