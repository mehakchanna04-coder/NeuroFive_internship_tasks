const express = require('express');
const router = express.Router();
const validate = require('../middleware/validate');
const { signup, login } = require('../controllers/authController');
const { signupRules, loginRules } = require('../validators/authValidators');

router.post('/signup', signupRules, validate, signup);
router.post('/login', loginRules, validate, login);

module.exports = router;
