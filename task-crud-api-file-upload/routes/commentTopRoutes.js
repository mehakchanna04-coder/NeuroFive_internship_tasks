const express = require('express');
const router = express.Router();

const requireAuth = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const { deleteComment } = require('../controllers/commentController');
const { commentIdParamRule } = require('../validators/commentValidators');

// DELETE /api/comments/:id — delete your own comment (requires auth)
router.delete('/:id', requireAuth, commentIdParamRule, validate, deleteComment);

module.exports = router;
