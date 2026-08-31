const Task = require('../models/Task');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../utils/apiResponse');
const { parsePagination, parseSort } = require('../utils/queryHelpers');

const SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'title', 'dueDate', 'status'];
const DEFAULT_SORT = { createdAt: -1 };

// Ownership check shared by update/delete: the task's creator may modify
// it, and so may any admin (admins can manage everyone's content). A
// task with no createdBy (created before this field existed) is treated
// as unowned and only admins may modify it, to be safe.
function assertCanModify(task, user) {
  const isOwner = task.createdBy && task.createdBy.toString() === user.id;
  const isAdmin = user.role === 'admin';
  if (!isOwner && !isAdmin) {
    throw new AppError('You can only modify your own tasks', 403);
  }
}

// GET /api/tasks
exports.getAllTasks = asyncHandler(async (req, res) => {
  const { status, category } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;

  const { page, limit, skip } = parsePagination(req.query);
  const sort = parseSort(req.query.sortBy, SORTABLE_FIELDS, DEFAULT_SORT);

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate('category', 'name description')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Task.countDocuments(filter),
  ]);

  sendPaginated(res, tasks, { page, limit, total });
});

// GET /api/tasks/:id
exports.getTaskById = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id).populate('category', 'name description');
  if (!task) {
    throw new AppError('Task not found', 404);
  }
  sendSuccess(res, task);
});

// POST /api/tasks
exports.createTask = asyncHandler(async (req, res) => {
  const { title, description, status, dueDate, category } = req.body;

  const task = await Task.create({
    title,
    description,
    status,
    dueDate,
    category: category || null,
    createdBy: req.user.id,
  });

  const populated = await task.populate('category', 'name description');
  sendSuccess(res, populated, 201);
});

// PUT /api/tasks/:id
exports.updateTask = asyncHandler(async (req, res) => {
  const existing = await Task.findById(req.params.id);
  if (!existing) {
    throw new AppError('Task not found', 404);
  }
  assertCanModify(existing, req.user);

  const { title, description, status, dueDate, category } = req.body;

  const task = await Task.findByIdAndUpdate(
    req.params.id,
    { title, description, status, dueDate, category },
    { new: true, runValidators: true, omitUndefined: true }
  ).populate('category', 'name description');

  sendSuccess(res, task);
});

// DELETE /api/tasks/:id
exports.deleteTask = asyncHandler(async (req, res) => {
  const existing = await Task.findById(req.params.id);
  if (!existing) {
    throw new AppError('Task not found', 404);
  }
  assertCanModify(existing, req.user);

  await existing.deleteOne();
  sendSuccess(res, { id: req.params.id, deleted: true });
});
