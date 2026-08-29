const Task = require('../models/Task');
const mongoose = require('mongoose');

// Small helper so every handler responds consistently on unexpected DB errors
function handleServerError(res, err, context) {
  console.error(`[Task] ${context} failed:`, err.message);
  res.status(500).json({
    error: 'Internal server error',
    context,
  });
}

// GET /api/tasks
exports.getAllTasks = async (req, res) => {
  try {
    const { status, category } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const tasks = await Task.find(filter)
      .populate('category', 'name description')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (err) {
    handleServerError(res, err, 'getAllTasks');
  }
};

// GET /api/tasks/:id
exports.getTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid task id' });
    }

    const task = await Task.findById(id).populate('category', 'name description');
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (err) {
    handleServerError(res, err, 'getTaskById');
  }
};

// POST /api/tasks
exports.createTask = async (req, res) => {
  try {
    const { title, description, status, dueDate, category } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (category && !mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ error: 'Invalid category id' });
    }

    const task = await Task.create({
      title,
      description,
      status,
      dueDate,
      category: category || null,
    });

    const populated = await task.populate('category', 'name description');
    res.status(201).json(populated);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    handleServerError(res, err, 'createTask');
  }
};

// PUT /api/tasks/:id
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid task id' });
    }

    const { title, description, status, dueDate, category } = req.body;

    if (category && !mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ error: 'Invalid category id' });
    }

    const task = await Task.findByIdAndUpdate(
      id,
      { title, description, status, dueDate, category },
      { new: true, runValidators: true, omitUndefined: true }
    ).populate('category', 'name description');

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    handleServerError(res, err, 'updateTask');
  }
};

// DELETE /api/tasks/:id
exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid task id' });
    }

    const task = await Task.findByIdAndDelete(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ message: 'Task deleted', id });
  } catch (err) {
    handleServerError(res, err, 'deleteTask');
  }
};
