const mongoose = require('mongoose');

// Force reliable DNS resolution (fixes SRV lookup issues on some Windows setups)
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const RETRIES = parseInt(process.env.DB_CONNECT_RETRIES || '5', 10);
const RETRY_DELAY = parseInt(process.env.DB_CONNECT_RETRY_DELAY || '3000', 10);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Connects to MongoDB with retry logic.
 * - Never crashes silently: every failure is logged.
 * - Retries a configurable number of times before giving up.
 * - Requires a real MONGODB_URI in .env; exits clearly if missing or unreachable.
 */
async function connectDB() {
  if (!process.env.JWT_SECRET) {
    console.error(
      '[Auth] FATAL: JWT_SECRET is not set. Add a strong random value to your .env file.'
    );
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('[DB] FATAL: MONGODB_URI is not set in your .env file.');
    process.exit(1);
  }

  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`[DB] Connected to MongoDB (attempt ${attempt}/${RETRIES})`);
      return;
    } catch (err) {
      console.error(
        `[DB] Connection attempt ${attempt}/${RETRIES} failed: ${err.message}`
      );

      if (attempt === RETRIES) {
        console.error(
          '[DB] FATAL: Could not connect to MongoDB after multiple attempts. Exiting.'
        );
        process.exit(1);
      }
      await sleep(RETRY_DELAY);
    }
  }
}

// Handle connection loss / errors AFTER the initial successful connection
// (e.g. DB restarts, network blip). We log loudly instead of letting
// requests silently fail against a dead connection.
mongoose.connection.on('error', (err) => {
  console.error('[DB] Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[DB] Mongoose lost connection to MongoDB.');
});

mongoose.connection.on('reconnected', () => {
  console.log('[DB] Mongoose reconnected to MongoDB.');
});

module.exports = connectDB;