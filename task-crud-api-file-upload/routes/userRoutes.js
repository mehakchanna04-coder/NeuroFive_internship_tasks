const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const { upload } = require('../config/upload');
const { getMe, uploadProfilePicture } = require('../controllers/userController');

router.get('/me', requireAuth, getMe);

// requireAuth runs BEFORE upload.single(), so req.user is already set
// when multer's filename() callback needs it, and unauthenticated
// requests never even reach the file-handling code.
router.post('/me/profile-picture', requireAuth, upload.single('profilePicture'), uploadProfilePicture);

module.exports = router;
