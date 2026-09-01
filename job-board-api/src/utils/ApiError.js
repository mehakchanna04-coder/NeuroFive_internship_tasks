/**
 * Standardized application error. Every deliberately-thrown error in the
 * codebase should be an ApiError so the central error handler can produce
 * a consistent JSON shape.
 */
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details; // e.g. field-level validation errors
    this.isOperational = true; // distinguishes expected errors from bugs
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }
  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, message);
  }
  static forbidden(message = "Forbidden") {
    return new ApiError(403, message);
  }
  static notFound(message = "Resource not found") {
    return new ApiError(404, message);
  }
  static conflict(message = "Conflict") {
    return new ApiError(409, message);
  }
  static internal(message = "Internal server error") {
    return new ApiError(500, message);
  }
}

module.exports = ApiError;
