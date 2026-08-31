const express = require('express');
// mergeParams lets this router see :id from the parent mount path
// (/api/tasks/:id/comments), since Express routers don't inherit
// params from their parent path by default.
const router = express.Router({ mergeParams: true });

const requireAuth = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const { getCommentsForTask, createComment } = require('../controllers/commentController');
const {
  taskIdForCommentsParamRule,
  createCommentRules,
  commentQueryRules,
} = require('../validators/commentValidators');

// GET /api/tasks/:id/comments — list comments for a task (public, paginated)
router.get('/', [...taskIdForCommentsParamRule, ...commentQueryRules], validate, getCommentsForTask);

// POST /api/tasks/:id/comments — add a comment (requires auth)
router.post('/', requireAuth, [...taskIdForCommentsParamRule, ...createCommentRules], validate, createComment);

module.exports = router;
