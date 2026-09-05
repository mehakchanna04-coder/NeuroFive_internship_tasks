const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");

const swaggerSpec = require("./swagger");
const { apiLimiter } = require("./middleware/rateLimiter");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth.routes");
const jobRoutes = require("./routes/job.routes");
const applicationRoutes = require("./routes/application.routes");

const app = express();

app.set("trust proxy", 1); // Vercel sits behind a proxy; needed for express-rate-limit to read real client IPs correctly

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}
app.use(apiLimiter);

// Health check for uptime monitors / deployment platforms
app.get("/health", (req, res) => {
  res.status(200).json({ success: true, message: "OK", uptime: process.uptime() });
});

// API docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api-docs.json", (req, res) => res.json(swaggerSpec));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes.standalone);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Job Board API — see /api-docs for documentation.",
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;