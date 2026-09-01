require("dotenv").config();

// sequelize-cli reads this file (not our app's runtime Sequelize instance)
// to know how to connect when running `db:migrate` / `db:seed`.
const base = {
  dialect: "postgres",
  logging: false,
};

module.exports = {
  development: {
    ...base,
    use_env_variable: "DATABASE_URL",
  },
  test: {
    ...base,
    use_env_variable: "TEST_DATABASE_URL",
  },
  production: {
    ...base,
    use_env_variable: "DATABASE_URL",
    dialectOptions: {
      ssl: process.env.DB_SSL === "true" ? { require: true, rejectUnauthorized: false } : undefined,
    },
  },
};
