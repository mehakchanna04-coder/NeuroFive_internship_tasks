const express = require('express');
const mongoose = require('mongoose');
const pinoHttp = require('pino-http');
const logger = require('./utils/logger');
const checkDbConnection = require('./middleware/checkDbConnection');
const errorHandler = require('./middleware/errorHandler');
const { sendError, sendSuccess } = require('./utils/apiResponse');
const taskRoutes = require('./routes/taskRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const authRoutes = require('./routes/authRoutes');
const commentRoutes = require('./routes/commentRoutes');
const commentTopRoutes = require('./routes/commentTopRoutes');

/**
 * The Express app, built and exported on its own (separate from server.js).
 *
 * This split exists so tests can `require('./app')` and drive it directly
 * with supertest, without ever calling app.listen() or connectDB() — the
 * test suite manages its own MongoDB connection (see tests/integration).
 * server.js is the only place that actually starts listening for requests.
 */
const app = express();

// Structured request logging: one JSON log line per request, with method,
// url, status code, response time, and a unique request id — not a
// console.log() sprinkled around. In tests (NODE_ENV=test) this is
// silenced so it doesn't clutter Jest output.
app.use(
  pinoHttp({
    logger,
    autoLogging: process.env.NODE_ENV !== 'test',
    customLogLevel: (req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  })
);

app.use(express.json());

// express.json() throws a SyntaxError on malformed JSON bodies before our
// routes ever run. Catch it here, right after the parser, so it gets the
// same standardized error shape as everything else instead of Express's
// default HTML error page.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return sendError(res, 400, 'Malformed JSON in request body');
  }
  next(err);
});

// Simple health check that also reports DB status
app.get('/health', (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  sendSuccess(res, { status: 'ok', db: states[mongoose.connection.readyState] });
});

// Block CRUD routes if the DB connection is down, so requests fail fast
// and clearly instead of hanging or throwing unhandled errors.
app.use('/api/auth', checkDbConnection, authRoutes);
app.use('/api/tasks/:id/comments', checkDbConnection, commentRoutes); // nested resource
app.use('/api/comments', checkDbConnection, commentTopRoutes);
app.use('/api/tasks', checkDbConnection, taskRoutes);
app.use('/api/categories', checkDbConnection, categoryRoutes);

// 404 handler — same standardized shape as every other response
app.use((req, res) => {
  sendError(res, 404, 'Route not found');
});

// Centralized error handler. MUST be registered last — Express routes any
// error passed to next(err) here, from anywhere in the app (validation,
// Mongoose errors, thrown AppErrors, or anything unexpected). This is the
// single place that decides what the client sees, and it never leaks a
// stack trace to them.
app.use(errorHandler);

module.exports = app;
