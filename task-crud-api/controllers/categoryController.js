const Category = require('../models/Category');
const mongoose = require('mongoose');

function handleServerError(res, err, context) {
  console.error(`[Category] ${context} failed:`, err.message);
  res.status(500).json({ error: 'Internal server error', context });
}

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    handleServerError(res, err, 'getAllCategories');
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    const category = await Category.create({ name, description });
    res.status(201).json(category);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Category name already exists' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    handleServerError(res, err, 'createCategory');
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid category id' });
    }
    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ message: 'Category deleted', id });
  } catch (err) {
    handleServerError(res, err, 'deleteCategory');
  }
};
