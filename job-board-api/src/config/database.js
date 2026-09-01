const { Sequelize } = require("sequelize");

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and configure it.");
}

const sequelize = new Sequelize(databaseUrl, {
  dialect: "postgres",
  logging: process.env.SQL_LOGGING === "true" ? console.log : false,
  dialectOptions: {
    ssl: process.env.DB_SSL === "true" ? { require: true, rejectUnauthorized: false } : undefined,
  },
  define: {
    underscored: false,
  },
});

module.exports = sequelize;
