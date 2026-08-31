const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const {
  getAllCategories,
  createCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { createCategoryRules, categoryIdParamRule } = require('../validators/categoryValidators');

// Reads are public. Writes require a valid JWT AND the 'admin' role —
// categories are a shared, system-level taxonomy, not personal content,
// so only admins may create or remove them.
router.get('/', getAllCategories);
router.post('/', requireAuth, requireRole('admin'), createCategoryRules, validate, createCategory);
router.delete('/:id', requireAuth, requireRole('admin'), categoryIdParamRule, validate, deleteCategory);

module.exports = router;
