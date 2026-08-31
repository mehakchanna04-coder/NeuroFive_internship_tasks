const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const checkDbConnection = require('./middleware/checkDbConnection');
const errorHandler = require('./middleware/errorHandler');
const { sendError, sendSuccess } = require('./utils/apiResponse');
const taskRoutes = require('./routes/taskRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const authRoutes = require('./routes/authRoutes');
const commentRoutes = require('./routes/commentRoutes');
const commentTopRoutes = require('./routes/commentTopRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

app.use(express.json());

// Serve uploaded files as static assets so their stored URL
// (/uploads/profile-pictures/<filename>) is directly reachable.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
app.use('/api/users', checkDbConnection, userRoutes);
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
