/**
 * Custom error class for expected, "operational" errors — bad input,
 * not-found resources, auth failures, duplicates, etc.
 *
 * Throwing an AppError anywhere inside an asyncHandler-wrapped route
 * automatically reaches the centralized error handler with the right
 * status code and a safe, client-facing message.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details; // optional array of field-level issues
    this.isOperational = true; // distinguishes expected errors from bugs
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
