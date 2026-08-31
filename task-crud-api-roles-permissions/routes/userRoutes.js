const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { upload } = require('../config/upload');
const {
  getMe,
  uploadProfilePicture,
  listUsers,
  updateUserRole,
  deleteUser,
} = require('../controllers/userController');
const { userIdParamRule, updateRoleRules, userQueryRules } = require('../validators/userValidators');

router.get('/me', requireAuth, getMe);

// requireAuth runs BEFORE upload.single(), so req.user is already set
// when multer's filename() callback needs it, and unauthenticated
// requests never even reach the file-handling code.
router.post('/me/profile-picture', requireAuth, upload.single('profilePicture'), uploadProfilePicture);

// --- Admin only ---
router.get('/', requireAuth, requireRole('admin'), userQueryRules, validate, listUsers);
router.patch('/:id/role', requireAuth, requireRole('admin'), [...userIdParamRule, ...updateRoleRules], validate, updateUserRole);
router.delete('/:id', requireAuth, requireRole('admin'), userIdParamRule, validate, deleteUser);

module.exports = router;
