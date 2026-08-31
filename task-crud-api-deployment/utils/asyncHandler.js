/**
 * Wraps an async route handler so any thrown error or rejected promise
 * is automatically forwarded to next(err) instead of crashing the
 * request (or the whole process, for unhandled rejections).
 *
 * Usage: router.post('/', asyncHandler(createTask))
 */
module.exports = function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
