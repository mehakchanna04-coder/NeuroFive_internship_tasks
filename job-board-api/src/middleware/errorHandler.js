const ApiError = require("../utils/ApiError");

/**
 * Converts thrown errors (ApiError, Prisma errors, JWT errors, or anything
 * unexpected) into one consistent JSON error shape:
 *   { success: false, message, details? }
 */
function errorHandler(err, req, res, next) {
  let error = err;

  // Sequelize known errors (unique constraint, FK violation, validation, etc.)
  if (error.name === "SequelizeUniqueConstraintError") {
    const field = error.errors?.[0]?.path || "value";
    error = ApiError.conflict(`A record with this ${field} already exists.`);
  } else if (error.name === "SequelizeForeignKeyConstraintError") {
    error = ApiError.badRequest("Related record does not exist.");
  } else if (error.name === "SequelizeValidationError") {
    const details = (error.errors || []).map((e) => ({ field: e.path, message: e.message }));
    error = ApiError.badRequest("Validation failed.", details);
  }

  // JWT errors
  if (error.name === "JsonWebTokenError") {
    error = ApiError.unauthorized("Invalid authentication token.");
  } else if (error.name === "TokenExpiredError") {
    error = ApiError.unauthorized("Authentication token has expired.");
  }

  if (!(error instanceof ApiError)) {
    // Unexpected/programmer error — don't leak internals to the client
    console.error("Unexpected error:", err);
    error = ApiError.internal(
      process.env.NODE_ENV === "development" ? err.message : "Something went wrong."
    );
  }

  const response = {
    success: false,
    message: error.message,
  };
  if (error.details) response.details = error.details;
  if (process.env.NODE_ENV === "development" && err.stack) {
    response.stack = err.stack;
  }

  res.status(error.statusCode || 500).json(response);
}

/** 404 handler for unmatched routes, placed before errorHandler. */
function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

module.exports = { errorHandler, notFoundHandler };
