const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/apiResponse');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Protects a route by requiring a valid JWT in the Authorization header:
 *   Authorization: Bearer <token>
 *
 * Returns distinct, clear error messages for each failure case, all in
 * the standard { success: false, error } response shape:
 *  - 401 missing token
 *  - 401 expired token
 *  - 401 invalid/malformed token
 */
module.exports = function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 401, 'No token provided');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return sendError(res, 401, 'No token provided');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.sub, email: decoded.email, role: decoded.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 401, 'Token expired, please log in again');
    }
    return sendError(res, 401, 'Invalid token');
  }
};
