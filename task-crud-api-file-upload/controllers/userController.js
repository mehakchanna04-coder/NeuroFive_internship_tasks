const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');

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
