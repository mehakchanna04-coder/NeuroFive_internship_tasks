const { z } = require("zod");

const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().toLowerCase().email("Must be a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  role: z.enum(["CANDIDATE", "EMPLOYER"]).optional().default("CANDIDATE"),
  // Note: ADMIN cannot be self-assigned via signup — see README security notes.
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Must be a valid email address"),
  password: z.string().min(1, "Password is required"),
});

module.exports = { signupSchema, loginSchema };
