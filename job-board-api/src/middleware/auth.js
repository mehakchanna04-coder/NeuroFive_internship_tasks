const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
const { User } = require("../models");
const asyncHandler = require("../utils/asyncHandler");

/**
 * Verifies the Bearer JWT on the request, loads the current user (minus
 * password hash), and attaches it as req.user. Throws 401 on any failure.
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw ApiError.unauthorized("Missing or malformed Authorization header.");
  }

  const payload = jwt.verify(token, process.env.JWT_SECRET);

  const user = await User.findByPk(payload.sub);
  if (!user) {
    throw ApiError.unauthorized("User belonging to this token no longer exists.");
  }

  req.user = { id: user.id, email: user.email, role: user.role, name: user.name };
  next();
});

/**
 * Role-based access control. Usage: authorize("EMPLOYER", "ADMIN")
 * Must run after `authenticate`.
 */
const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized("Authentication required."));
  }
  if (!allowedRoles.includes(req.user.role)) {
    return next(
      ApiError.forbidden(
        `Role '${req.user.role}' is not permitted to perform this action.`
      )
    );
  }
  next();
};

module.exports = { authenticate, authorize };
