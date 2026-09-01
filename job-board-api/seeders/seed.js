/* eslint-disable no-console */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { sequelize, User, Job, Application } = require("../src/models");

async function main() {
  await sequelize.authenticate();

  const passwordHash = await bcrypt.hash("password123", 10);

  const [admin] = await User.findOrCreate({
    where: { email: "admin@jobboard.dev" },
    defaults: { name: "Admin User", email: "admin@jobboard.dev", passwordHash, role: "ADMIN" },
  });

  const [employer] = await User.findOrCreate({
    where: { email: "employer@jobboard.dev" },
    defaults: {
      name: "Acme Corp Recruiter",
      email: "employer@jobboard.dev",
      passwordHash,
      role: "EMPLOYER",
    },
  });

  const [candidate] = await User.findOrCreate({
    where: { email: "candidate@jobboard.dev" },
    defaults: {
      name: "Jamie Candidate",
      email: "candidate@jobboard.dev",
      passwordHash,
      role: "CANDIDATE",
    },
  });

  const [job] = await Job.findOrCreate({
    where: { title: "Backend Engineer", employerId: employer.id },
    defaults: {
      title: "Backend Engineer",
      company: "Acme Corp",
      description: "Build and maintain our core REST APIs using Node.js and PostgreSQL.",
      location: "Remote",
      type: "FULL_TIME",
      salaryMin: 90000,
      salaryMax: 130000,
      employerId: employer.id,
    },
  });

  await Application.findOrCreate({
    where: { jobId: job.id, candidateId: candidate.id },
    defaults: {
      jobId: job.id,
      candidateId: candidate.id,
      coverNote: "I'd love to bring my Node.js experience to this role!",
    },
  });

  console.log("Seed complete:", {
    admin: admin.email,
    employer: employer.email,
    candidate: candidate.email,
    job: job.title,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await sequelize.close();
  });
