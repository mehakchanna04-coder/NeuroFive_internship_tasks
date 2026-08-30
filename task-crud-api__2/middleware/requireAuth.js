const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Protects a route by requiring a valid JWT in the Authorization header:
 *   Authorization: Bearer <token>
 *
 * Returns distinct, clear error messages for each failure case, since the
 * task explicitly asks for this rather than one generic "unauthorized":
 *  - 401 missing token
 *  - 401 expired token
 *  - 401 invalid/malformed token
 */
module.exports = function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Attach the identified user to the request for downstream handlers.
    req.user = { id: decoded.sub, email: decoded.email };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired, please log in again' });
    }
    // Covers malformed tokens, bad signature, wrong secret, etc.
    return res.status(401).json({ error: 'Invalid token' });
  }
};
