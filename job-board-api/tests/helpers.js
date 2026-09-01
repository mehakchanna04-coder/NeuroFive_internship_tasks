const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const { sequelize, Application, Job, User } = require("../src/models");

/** Deletes all rows in FK-safe order. Call between tests for isolation. */
async function cleanDb() {
  await Application.destroy({ where: {}, truncate: true, cascade: true });
  await Job.destroy({ where: {}, truncate: true, cascade: true });
  await User.destroy({ where: {}, truncate: true, cascade: true });
}

let counter = 0;
function uniqueEmail(prefix = "user") {
  counter += 1;
  return `${prefix}${Date.now()}${counter}@example.com`;
}

/** Signs up a user via the real HTTP endpoint and returns { user, token }. */
async function registerUser(role = "CANDIDATE", overrides = {}) {
  const email = overrides.email || uniqueEmail(role.toLowerCase());
  const res = await request(app)
    .post("/api/auth/signup")
    .send({
      name: overrides.name || `Test ${role}`,
      email,
      password: overrides.password || "password123",
      role,
    });
  return { res, user: res.body.data.user, token: res.body.data.token };
}

/**
 * Seeds an ADMIN user directly via the model, since (by design) the public
 * signup endpoint refuses to let anyone self-assign the ADMIN role.
 * Returns { user, token } shaped like registerUser()'s return value.
 */
async function createAdminUser(overrides = {}) {
  const email = overrides.email || uniqueEmail("admin");
  const passwordHash = await bcrypt.hash(overrides.password || "password123", 10);
  const user = await User.create({
    name: overrides.name || "Test Admin",
    email,
    passwordHash,
    role: "ADMIN",
  });
  const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
  return { user: user.toPublic(), token };
}

module.exports = { cleanDb, registerUser, createAdminUser, uniqueEmail, app, request, sequelize };
