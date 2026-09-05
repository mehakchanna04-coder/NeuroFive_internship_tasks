const { Sequelize } = require("sequelize");
const pg = require("pg");

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and configure it.");
}

const sequelize = new Sequelize(databaseUrl, {
  dialect: "postgres",
  dialectModule: pg, // pass the driver directly so bundlers (Vercel) don't need to trace Sequelize's internal dynamic require
  logging: process.env.SQL_LOGGING === "true" ? console.log : false,
  dialectOptions: {
    ssl: process.env.DB_SSL === "true" ? { require: true, rejectUnauthorized: false } : undefined,
  },
  define: {
    underscored: false,
  },
});

module.exports = sequelize;