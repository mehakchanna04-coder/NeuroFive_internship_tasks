require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB(); // exits process on unrecoverable failure, logs on retry
  app.listen(PORT, () => {
    console.log(`[Server] Listening on port ${PORT}`);
  });
}

start();

// Don't let unexpected errors die silently. These are last-resort safety
// nets — properly awaited/caught async code should never actually reach
// unhandledRejection, since asyncHandler forwards those to errorHandler.
process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught exception:', err);
  process.exit(1);
});
