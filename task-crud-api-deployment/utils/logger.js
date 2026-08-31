const pino = require('pino');

/**
 * A single structured logger for the whole app. Every log line is a JSON
 * object (timestamp, level, message, and any extra fields passed in) —
 * not free-text console.log() calls — so logs can actually be searched,
 * filtered, and aggregated by a real logging platform (or Vercel's own
 * log viewer) instead of being scraped as plain strings.
 *
 * Log level defaults to 'info' in production and 'debug' locally, and can
 * always be overridden with the LOG_LEVEL env var.
 */
const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  base: undefined, // omit pid/hostname — noisy and not useful in serverless logs
  timestamp: pino.stdTimeFunctions.isoTime,
});

module.exports = logger;
