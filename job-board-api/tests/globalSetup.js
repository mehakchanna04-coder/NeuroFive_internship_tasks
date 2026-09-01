const { execSync } = require("child_process");
require("dotenv").config();

module.exports = async () => {
  console.log("\n[globalSetup] Applying migrations to test database...");
  execSync("npx sequelize-cli db:migrate --env test", {
    stdio: "inherit",
    env: { ...process.env },
  });
};
