const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// POST /api/auth/signup
exports.signup = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Password hashing happens automatically in the User model's pre-save hook.
    const user = await User.create({ email, password });

    const token = signToken(user);
    res.status(201).json({
      message: 'Account created',
      token,
      user: { id: user._id, email: user.email },
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    console.error('[Auth] signup failed:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Explicitly select password since the schema excludes it by default.
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    // Same generic error whether the email doesn't exist or the password is
    // wrong — never reveal which one it was, that leaks account existence.
    const invalidMsg = { error: 'Invalid email or password' };
    if (!user) {
      return res.status(401).json(invalidMsg);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json(invalidMsg);
    }

    const token = signToken(user);
    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, email: user.email },
    });
  } catch (err) {
    console.error('[Auth] login failed:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};
