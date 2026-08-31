const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../utils/apiResponse');
const { parsePagination, parseSort } = require('../utils/queryHelpers');

const SORTABLE_FIELDS = ['createdAt', 'email', 'role'];
const DEFAULT_SORT = { createdAt: -1 };

// GET /api/users/me
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  sendSuccess(res, user);
});

// POST /api/users/me/profile-picture
exports.uploadProfilePicture = asyncHandler(async (req, res) => {
  // multer's fileFilter/limits already rejected bad type/size before this
  // handler even runs (see middleware/errorHandler's MulterError handling
  // and config/upload.js). If we get here, req.file is a valid upload.
  if (!req.file) {
    throw new AppError('No file uploaded. Attach a file under the field name "profilePicture".', 400);
  }

  const publicUrl = `/uploads/profile-pictures/${req.file.filename}`;

  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePictureUrl: publicUrl },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new AppError('User not found', 404);
    }

    sendSuccess(res, {
      profilePictureUrl: user.profilePictureUrl,
      user: { id: user._id, email: user.email },
    });
  } catch (err) {
    // If the DB update fails after the file was already written to disk,
    // clean it up rather than leaving an orphaned file nothing points to.
    const savedPath = path.join(__dirname, '..', 'uploads', 'profile-pictures', req.file.filename);
    fs.unlink(savedPath, () => {}); // best-effort, don't block the error response on this
    throw err;
  }
});

// --- Admin-only endpoints below ---
// All three are additionally protected by requireRole('admin') at the
// route level (see routes/userRoutes.js) — this is where the "admin can
// manage everyone" permission from the task description actually lives.

// GET /api/users (admin only)
exports.listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const sort = parseSort(req.query.sortBy, SORTABLE_FIELDS, DEFAULT_SORT);

  const [users, total] = await Promise.all([
    User.find().sort(sort).skip(skip).limit(limit),
    User.countDocuments(),
  ]);

  sendPaginated(res, users, { page, limit, total });
});

// PATCH /api/users/:id/role (admin only)
// Lets an admin promote a user to admin, or demote an admin back to user.
// This is the ONLY way a user's role can ever change — never via signup
// or a user editing their own record.
exports.updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;

  if (req.params.id === req.user.id && role === 'user') {
    // Prevent an admin from accidentally locking themselves out with no
    // other admins around. A deliberate safety guard, not strictly
    // required by the task, but reflects real-world admin panels.
    throw new AppError('You cannot demote yourself', 400);
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true, runValidators: true }
  );

  if (!user) {
    throw new AppError('User not found', 404);
  }

  sendSuccess(res, user);
});

// DELETE /api/users/:id (admin only)
exports.deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) {
    throw new AppError('You cannot delete your own account via this endpoint', 400);
  }

  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  sendSuccess(res, { id: req.params.id, deleted: true });
});
