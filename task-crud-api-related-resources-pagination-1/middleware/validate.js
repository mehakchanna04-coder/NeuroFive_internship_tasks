const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

/**
 * Runs after an array of express-validator check()/body()/param() rules.
 * If any failed, collects them into a clean details array and throws a
 * single AppError — so validation failures flow through the same
 * centralized error handler as everything else, with the same response shape.
 */
module.exports = function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const details = errors.array().map((e) => ({
    field: e.path,
    message: e.msg,
  }));

  next(new AppError('Validation failed', 400, details));
};
