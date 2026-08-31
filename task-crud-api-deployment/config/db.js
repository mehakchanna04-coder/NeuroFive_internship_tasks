const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Force reliable DNS resolution (fixes SRV lookup issues on some Windows setups)
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const MONGODB_URI = process.env.MONGODB_URI;
const RETRIES = parseInt(process.env.DB_CONNECT_RETRIES || '5', 10);
const RETRY_DELAY = parseInt(process.env.DB_CONNECT_RETRY_DELAY || '3000', 10);

// Vercel sets this automatically on every deployment/invocation. Serverless
// functions shouldn't call process.exit() -- there's no long-lived process
// to "restart"; exiting mid-invocation just produces an ugly platform-level
// error instead of our own clean one. On a traditional host (Render, a VM,
// plain `node server.js`), exiting deliberately on a fatal config error is
// still the right call, so that behavior is kept for everywhere else.
const isServerless = Boolean(process.env.VERCEL);

function fatal(message) {
  logger.error({ fatal: true }, message);
  if (isServerless) {
    throw new Error(message);
  }
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Connects to MongoDB with retry logic.
 * - Never crashes silently: every failure is logged as structured JSON.
 * - Retries a configurable number of times before giving up.
 * - Safe to call on every request in a serverless environment: if a
 *   connection from a previous (warm) invocation is still open, this
 *   returns immediately instead of opening a redundant connection.
 */
async function connectDB() {
  // Already connected (or actively connecting) from a previous call in the
  // same warm process -- nothing to do. Critical for serverless, where the
  // module can stay loaded (and the connection alive) across invocations.
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return;
  }

  if (!MONGODB_URI) {
    return fatal('MONGODB_URI is not set. Create a .env file (see .env.example) with your connection string.');
  }

  if (!process.env.JWT_SECRET) {
    return fatal('JWT_SECRET is not set. Add a strong random value to your .env file.');
  }

  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      logger.info({ attempt, retries: RETRIES }, 'Connected to MongoDB');
      return;
    } catch (err) {
      logger.warn(
        { attempt, retries: RETRIES, err: err.message },
        'MongoDB connection attempt failed'
      );
      if (attempt === RETRIES) {
        return fatal('Could not connect to MongoDB after multiple attempts.');
      }
      await sleep(RETRY_DELAY);
    }
  }
}

// Handle connection loss / errors AFTER the initial successful connection
// (e.g. DB restarts, network blip). We log loudly instead of letting
// requests silently fail against a dead connection.
mongoose.connection.on('error', (err) => {
  logger.error({ err: err.message }, 'Mongoose connection error');
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose lost connection to MongoDB');
});

mongoose.connection.on('reconnected', () => {
  logger.info('Mongoose reconnected to MongoDB');
});

module.exports = connectDB;
