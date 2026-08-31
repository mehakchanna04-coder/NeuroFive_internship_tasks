const { param, body, query } = require('express-validator');

exports.userIdParamRule = [
  param('id').isMongoId().withMessage('Invalid user id'),
];

exports.updateRoleRules = [
  body('role')
    .notEmpty().withMessage('role is required')
    .isIn(['user', 'admin']).withMessage('role must be either "user" or "admin"'),
];

exports.userQueryRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('sortBy')
    .optional()
    .matches(/^-?(createdAt|email|role)$/)
    .withMessage('sortBy must be one of: createdAt, email, role (prefix with - for descending)'),
];
