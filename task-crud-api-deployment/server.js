require('dotenv').config();
const connectDB = require('./config/db');
const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

/**
 * This file is the entry point for running the API as a normal, always-on
 * process (locally, on a VM, or on a traditional host like Render) --
 * `npm start` runs this. It is NOT used when deployed to Vercel, which
 * instead calls the serverless handler in api/index.js directly and
 * manages the process lifecycle itself (see README "Deployment" section
 * for why that distinction matters).
 */
async function start() {
  await connectDB(); // exits the process on unrecoverable failure, logs every retry
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Server listening');
  });
}

start();

// Last-resort safety nets so a crash is always logged with full context
// before the process exits, instead of dying silently or dumping a raw
// stack trace to stdout. Properly awaited/caught async code should never
// actually reach unhandledRejection, since asyncHandler forwards those to
// the centralized error handler -- this only catches genuine bugs.
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception -- process exiting');
  process.exit(1);
});
