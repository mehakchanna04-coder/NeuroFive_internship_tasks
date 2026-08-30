const Task = require('../models/Task');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');

// GET /api/tasks
exports.getAllTasks = asyncHandler(async (req, res) => {
  const { status, category } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;

  const tasks = await Task.find(filter)
    .populate('category', 'name description')
    .sort({ createdAt: -1 });

  sendSuccess(res, tasks);
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
  });

  const populated = await task.populate('category', 'name description');
  sendSuccess(res, populated, 201);
});

// PUT /api/tasks/:id
exports.updateTask = asyncHandler(async (req, res) => {
  const { title, description, status, dueDate, category } = req.body;

  const task = await Task.findByIdAndUpdate(
    req.params.id,
    { title, description, status, dueDate, category },
    { new: true, runValidators: true, omitUndefined: true }
  ).populate('category', 'name description');

  if (!task) {
    throw new AppError('Task not found', 404);
  }
  sendSuccess(res, task);
});

// DELETE /api/tasks/:id
exports.deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findByIdAndDelete(req.params.id);
  if (!task) {
    throw new AppError('Task not found', 404);
  }
  sendSuccess(res, { id: req.params.id, deleted: true });
});
