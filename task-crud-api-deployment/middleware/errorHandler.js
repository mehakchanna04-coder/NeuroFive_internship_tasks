const { sendError } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Centralized error handler. This is the LAST middleware in the stack
 * (registered after all routes), so any error passed to next(err) —
 * from asyncHandler, validation, malformed JSON, or Mongoose — lands
 * here and gets turned into one consistent, safe response shape.
 *
 * Nothing here ever sends a raw stack trace to the client. Full errors
 * are logged server-side only, as a structured JSON log line (not
 * console.error), including the request id so it can be correlated with
 * the matching request-log line from pino-http.
 */
module.exports = function errorHandler(err, req, res, next) {
  // req.log is the per-request logger pino-http attaches; falls back to
  // the base logger for the rare case a request never reached that middleware.
  const log = req.log || logger;

  log.error(
    {
      err,
      method: req.method,
      url: req.originalUrl,
      statusCode: err.statusCode || 500,
    },
    'Request failed'
  );

  // Malformed JSON body (thrown by express.json() itself)
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return sendError(res, 400, 'Malformed JSON in request body');
  }

  // Mongoose: invalid ObjectId format (e.g. /api/tasks/not-a-real-id)
  if (err.name === 'CastError') {
    return sendError(res, 400, `Invalid ${err.path}: ${err.value}`);
  }

  // Mongoose: schema validation failed (required field missing, bad enum, etc.)
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => e.message);
    return sendError(res, 400, 'Validation failed', details);
  }

  // Mongoose: duplicate key (unique index violation, e.g. email or category name)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return sendError(res, 409, `Duplicate value for ${field}`);
  }

  // JWT errors that somehow bypass the auth middleware itself
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 401, 'Invalid token');
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 401, 'Token expired, please log in again');
  }

  // Our own thrown AppErrors carry their own status code + safe message
  if (err.isOperational) {
    return sendError(res, err.statusCode, err.message, err.details);
  }

  // Anything unrecognized: don't leak internals, just a generic 500
  return sendError(res, 500, 'Internal server error');
};
