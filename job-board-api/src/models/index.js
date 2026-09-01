const sequelize = require("../config/database");
const User = require("./user.model");
const Job = require("./job.model");
const Application = require("./application.model");

// User (EMPLOYER) --< Job
User.hasMany(Job, { foreignKey: "employerId", as: "jobs", onDelete: "CASCADE" });
Job.belongsTo(User, { foreignKey: "employerId", as: "employer" });

// Job --< Application
Job.hasMany(Application, { foreignKey: "jobId", as: "applications", onDelete: "CASCADE" });
Application.belongsTo(Job, { foreignKey: "jobId", as: "job" });

// User (CANDIDATE) --< Application
User.hasMany(Application, { foreignKey: "candidateId", as: "applications", onDelete: "CASCADE" });
Application.belongsTo(User, { foreignKey: "candidateId", as: "candidate" });

module.exports = { sequelize, User, Job, Application };
