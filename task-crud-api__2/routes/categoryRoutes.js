const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const {
  getAllCategories,
  createCategory,
  deleteCategory,
} = require('../controllers/categoryController');

// Reads are public; writes require a valid JWT.
router.get('/', getAllCategories);
router.post('/', requireAuth, createCategory);
router.delete('/:id', requireAuth, deleteCategory);

module.exports = router;
