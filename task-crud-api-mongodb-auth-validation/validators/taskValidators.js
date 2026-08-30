const { body, param, query } = require('express-validator');

const VALID_STATUSES = ['pending', 'in-progress', 'completed'];

exports.createTaskRules = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 120 }).withMessage('Title must be 120 characters or fewer'),
  body('description')
    .optional({ checkFalsy: true })
    .isString().withMessage('Description must be a string')
    .isLength({ max: 1000 }).withMessage('Description must be 1000 characters or fewer'),
  body('status')
    .optional()
    .isIn(VALID_STATUSES).withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),
  body('dueDate')
    .optional({ checkFalsy: true })
    .isISO8601().withMessage('dueDate must be a valid date (ISO 8601, e.g. 2026-09-01)'),
  body('category')
    .optional({ checkFalsy: true })
    .isMongoId().withMessage('category must be a valid id'),
];

exports.updateTaskRules = [
  body('title')
    .optional()
    .trim()
    .notEmpty().withMessage('Title cannot be empty')
    .isLength({ max: 120 }).withMessage('Title must be 120 characters or fewer'),
  body('description')
    .optional({ checkFalsy: true })
    .isString().withMessage('Description must be a string')
    .isLength({ max: 1000 }).withMessage('Description must be 1000 characters or fewer'),
  body('status')
    .optional()
    .isIn(VALID_STATUSES).withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),
  body('dueDate')
    .optional({ checkFalsy: true })
    .isISO8601().withMessage('dueDate must be a valid date (ISO 8601, e.g. 2026-09-01)'),
  body('category')
    .optional({ checkFalsy: true })
    .isMongoId().withMessage('category must be a valid id'),
];

exports.taskIdParamRule = [
  param('id').isMongoId().withMessage('Invalid task id'),
];

exports.taskQueryRules = [
  query('status')
    .optional()
    .isIn(VALID_STATUSES).withMessage(`status filter must be one of: ${VALID_STATUSES.join(', ')}`),
  query('category')
    .optional()
    .isMongoId().withMessage('category filter must be a valid id'),
];
