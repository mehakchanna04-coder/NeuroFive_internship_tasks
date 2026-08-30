const { body, param, query } = require('express-validator');

exports.taskIdForCommentsParamRule = [
  param('id').isMongoId().withMessage('Invalid task id'),
];

exports.commentIdParamRule = [
  param('id').isMongoId().withMessage('Invalid comment id'),
];

exports.createCommentRules = [
  body('content')
    .trim()
    .notEmpty().withMessage('Comment content is required')
    .isLength({ max: 500 }).withMessage('Comment must be 500 characters or fewer'),
];

exports.commentQueryRules = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('sortBy')
    .optional()
    .isString().withMessage('sortBy must be a string')
    .matches(/^-?(createdAt|updatedAt)$/)
    .withMessage('sortBy must be one of: createdAt, updatedAt (prefix with - for descending)'),
];
