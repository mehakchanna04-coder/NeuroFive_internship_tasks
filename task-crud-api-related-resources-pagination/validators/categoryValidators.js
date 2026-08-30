const { body, param } = require('express-validator');

exports.createCategoryRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Category name is required')
    .isLength({ max: 50 }).withMessage('Category name must be 50 characters or fewer'),
  body('description')
    .optional({ checkFalsy: true })
    .isString().withMessage('Description must be a string')
    .isLength({ max: 200 }).withMessage('Description must be 200 characters or fewer'),
];

exports.categoryIdParamRule = [
  param('id').isMongoId().withMessage('Invalid category id'),
];
