require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Job Board API listening on port ${PORT}`);
  console.log(`📚 Swagger docs: http://localhost:${PORT}/api-docs`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully.");
  server.close(() => process.exit(0));
});

module.exports = server;
