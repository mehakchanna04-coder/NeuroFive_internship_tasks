const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Exported so it can be unit-tested in isolation (see tests/unit/signToken.test.js)
// without spinning up the server or touching the database.
exports.signToken = signToken;

// POST /api/auth/signup
exports.signup = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    throw new AppError('An account with this email already exists', 409);
  }

  // Password hashing happens automatically in the User model's pre-save hook.
  const user = await User.create({ email, password });

  const token = signToken(user);
  sendSuccess(res, { token, user: { id: user._id, email: user.email } }, 201);
});

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Explicitly select password since the schema excludes it by default.
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

  // Same generic error whether the email doesn't exist or the password is
  // wrong — never reveal which one it was, that leaks account existence.
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = signToken(user);
  sendSuccess(res, { token, user: { id: user._id, email: user.email } });
});
