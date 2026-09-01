require("dotenv").config();

// Route Prisma at the dedicated test database so `npm test` never touches
// dev data. Falls back to DATABASE_URL if TEST_DATABASE_URL isn't set.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key";
process.env.NODE_ENV = "test";
