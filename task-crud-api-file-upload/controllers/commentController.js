const Comment = require('../models/Comment');
const Task = require('../models/Task');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../utils/apiResponse');
const { parsePagination, parseSort } = require('../utils/queryHelpers');

const SORTABLE_FIELDS = ['createdAt', 'updatedAt'];
const DEFAULT_SORT = { createdAt: 1 }; // oldest first, like a normal comment thread

// GET /api/tasks/:id/comments
exports.getCommentsForTask = asyncHandler(async (req, res) => {
  const { id: taskId } = req.params;

  const task = await Task.findById(taskId);
  if (!task) {
    throw new AppError('Task not found', 404);
  }

  const { page, limit, skip } = parsePagination(req.query);
  const sort = parseSort(req.query.sortBy, SORTABLE_FIELDS, DEFAULT_SORT);

  const [comments, total] = await Promise.all([
    Comment.find({ task: taskId })
      .populate('author', 'email')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Comment.countDocuments({ task: taskId }),
  ]);

  sendPaginated(res, comments, { page, limit, total });
});

// POST /api/tasks/:id/comments
exports.createComment = asyncHandler(async (req, res) => {
  const { id: taskId } = req.params;

  const task = await Task.findById(taskId);
  if (!task) {
    throw new AppError('Task not found', 404);
  }

  const comment = await Comment.create({
    task: taskId,
    author: req.user.id,
    content: req.body.content,
  });

  const populated = await comment.populate('author', 'email');
  sendSuccess(res, populated, 201);
});

// DELETE /api/comments/:id
// Only the comment's own author may delete it.
exports.deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  if (comment.author.toString() !== req.user.id) {
    throw new AppError('You can only delete your own comments', 403);
  }

  await comment.deleteOne();
  sendSuccess(res, { id: req.params.id, deleted: true });
});
