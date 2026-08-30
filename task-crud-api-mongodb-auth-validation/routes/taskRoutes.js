const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} = require('../controllers/taskController');
const {
  createTaskRules,
  updateTaskRules,
  taskIdParamRule,
  taskQueryRules,
} = require('../validators/taskValidators');

// Reads are public; writes require a valid JWT. Every route is validated.
router.get('/', taskQueryRules, validate, getAllTasks);
router.get('/:id', taskIdParamRule, validate, getTaskById);
router.post('/', requireAuth, createTaskRules, validate, createTask);
router.put('/:id', requireAuth, [...taskIdParamRule, ...updateTaskRules], validate, updateTask);
router.delete('/:id', requireAuth, taskIdParamRule, validate, deleteTask);

module.exports = router;
