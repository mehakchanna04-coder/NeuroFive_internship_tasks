const swaggerJSDoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Job Board API",
      version: "1.0.0",
      description:
        "REST API for a job board: employers post jobs, candidates apply. " +
        "JWT auth with role-based access control (CANDIDATE / EMPLOYER / ADMIN).",
    },
    servers: [
      { url: "http://localhost:" + (process.env.PORT || 4000), description: "Local" },
      { url: process.env.PUBLIC_URL || "https://your-deployed-url.example.com", description: "Production" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  },
  apis: ["./src/routes/*.js"],
};

module.exports = swaggerJSDoc(options);
