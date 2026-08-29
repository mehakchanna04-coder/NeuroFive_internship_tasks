require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const checkDbConnection = require('./middleware/checkDbConnection');
const taskRoutes = require('./routes/taskRoutes');
const categoryRoutes = require('./routes/categoryRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// Simple health check that also reports DB status
app.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    status: 'ok',
    db: states[mongoose.connection.readyState],
  });
});

// Block CRUD routes if the DB connection is down, so requests fail fast
// and clearly instead of hanging or throwing unhandled errors.
app.use('/api/tasks', checkDbConnection, taskRoutes);
app.use('/api/categories', checkDbConnection, categoryRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Catch-all error handler (e.g. malformed JSON body)
app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err.message);
  res.status(500).json({ error: 'Something went wrong' });
});

async function start() {
  await connectDB(); // exits process on unrecoverable failure, logs on retry
  app.listen(PORT, () => {
    console.log(`[Server] Listening on port ${PORT}`);
  });
}

start();

// Don't let unexpected errors die silently
process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught exception:', err);
  process.exit(1);
});
