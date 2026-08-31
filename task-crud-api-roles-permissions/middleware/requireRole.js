const { sendError } = require('../utils/apiResponse');

/**
 * Restricts a route to specific roles. Must run AFTER requireAuth, since
 * it depends on req.user being already set.
 *
 * Usage: router.post('/', requireAuth, requireRole('admin'), createCategory)
 *
 * Deliberately returns 403 Forbidden, not 401 Unauthorized — the request
 * has a perfectly valid, authenticated user, they're just not allowed to
 * do this specific thing. 401 means "we don't know who you are"; 403
 * means "we know who you are, and the answer is no."
 */
module.exports = function requireRole(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user) {
      // Defensive check — this middleware is meaningless without requireAuth
      // having run first. If it somehow gets mounted alone, fail safe.
      return sendError(res, 401, 'No token provided');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        403,
        `Forbidden: this action requires one of these roles: ${allowedRoles.join(', ')}`
      );
    }

    next();
  };
};
