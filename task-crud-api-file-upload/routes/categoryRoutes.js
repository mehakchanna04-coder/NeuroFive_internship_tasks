const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const {
  getAllCategories,
  createCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { createCategoryRules, categoryIdParamRule } = require('../validators/categoryValidators');

// Reads are public; writes require a valid JWT. Every route is validated.
router.get('/', getAllCategories);
router.post('/', requireAuth, createCategoryRules, validate, createCategory);
router.delete('/:id', requireAuth, categoryIdParamRule, validate, deleteCategory);

module.exports = router;
