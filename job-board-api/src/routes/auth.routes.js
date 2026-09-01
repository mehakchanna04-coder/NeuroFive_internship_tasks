const express = require("express");
const { signup, login, getMe } = require("../controllers/auth.controller");
const { signupSchema, loginSchema } = require("../validators/auth.validator");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

/**
 * @openapi
 * /api/auth/signup:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: "Ada Lovelace" }
 *               email: { type: string, example: "ada@example.com" }
 *               password: { type: string, example: "supersecret123" }
 *               role: { type: string, enum: [CANDIDATE, EMPLOYER], example: "CANDIDATE" }
 *     responses:
 *       201: { description: User created, returns user + JWT }
 *       400: { description: Validation error }
 *       409: { description: Email already registered }
 */
router.post("/signup", authLimiter, validate(signupSchema), signup);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in and receive a JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful, returns user + JWT }
 *       401: { description: Invalid credentials }
 */
router.post("/login", authLimiter, validate(loginSchema), login);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the currently authenticated user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Current user }
 *       401: { description: Not authenticated }
 */
router.get("/me", authenticate, getMe);

module.exports = router;
