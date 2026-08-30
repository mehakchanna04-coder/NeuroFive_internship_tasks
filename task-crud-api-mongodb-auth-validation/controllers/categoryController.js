const Category = require('../models/Category');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');

// GET /api/categories
exports.getAllCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  sendSuccess(res, categories);
});

// POST /api/categories
exports.createCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const category = await Category.create({ name, description });
  sendSuccess(res, category, 201);
});

// DELETE /api/categories/:id
exports.deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) {
    throw new AppError('Category not found', 404);
  }
  sendSuccess(res, { id: req.params.id, deleted: true });
});
