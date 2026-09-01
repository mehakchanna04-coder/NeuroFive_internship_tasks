const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const SALT_ROUNDS = 10;

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

// POST /api/auth/signup
const signup = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw ApiError.conflict("An account with this email already exists.");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name, email, passwordHash, role });

  const token = signToken(user);
  res.status(201).json({ success: true, data: { user: user.toPublic(), token } });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw ApiError.unauthorized("Invalid email or password.");
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw ApiError.unauthorized("Invalid email or password.");
  }

  const token = signToken(user);
  res.status(200).json({ success: true, data: { user: user.toPublic(), token } });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id);
  if (!user) throw ApiError.notFound("User not found.");
  res.status(200).json({ success: true, data: { user: user.toPublic() } });
});

module.exports = { signup, login, getMe };
