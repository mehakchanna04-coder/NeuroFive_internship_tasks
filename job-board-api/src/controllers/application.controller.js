const { Application, Job, User } = require("../models");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

// POST /api/jobs/:jobId/applications  (CANDIDATE)
const createApplication = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  const job = await Job.findByPk(jobId);
  if (!job) throw ApiError.notFound("Job not found.");
  if (!job.isActive) throw ApiError.badRequest("This job is no longer accepting applications.");

  const existing = await Application.findOne({ where: { jobId, candidateId: req.user.id } });
  if (existing) {
    throw ApiError.conflict("You have already applied to this job.");
  }

  const application = await Application.create({
    ...req.body,
    jobId,
    candidateId: req.user.id,
  });
  res.status(201).json({ success: true, data: { application } });
});

// GET /api/jobs/:jobId/applications  (EMPLOYER who owns the job, or ADMIN)
const listApplicationsForJob = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const { page, limit, status } = req.query;

  const job = await Job.findByPk(jobId);
  if (!job) throw ApiError.notFound("Job not found.");
  if (req.user.role !== "ADMIN" && job.employerId !== req.user.id) {
    throw ApiError.forbidden("You do not have permission to view these applications.");
  }

  const where = { jobId, ...(status && { status }) };
  const { rows: applications, count: total } = await Application.findAndCountAll({
    where,
    offset: (page - 1) * limit,
    limit,
    order: [["createdAt", "DESC"]],
    include: [{ model: User, as: "candidate", attributes: ["id", "name", "email"] }],
  });

  res.status(200).json({
    success: true,
    data: { applications },
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
});

// GET /api/applications/mine  (CANDIDATE) — applications the current user submitted
const listMyApplications = asyncHandler(async (req, res) => {
  const applications = await Application.findAll({
    where: { candidateId: req.user.id },
    order: [["createdAt", "DESC"]],
    include: [{ model: Job, as: "job", attributes: ["id", "title", "company", "isActive"] }],
  });
  res.status(200).json({ success: true, data: { applications } });
});

// PATCH /api/applications/:id/status  (EMPLOYER who owns the job, or ADMIN)
const updateApplicationStatus = asyncHandler(async (req, res) => {
  const application = await Application.findByPk(req.params.id, {
    include: [{ model: Job, as: "job" }],
  });
  if (!application) throw ApiError.notFound("Application not found.");
  if (req.user.role !== "ADMIN" && application.job.employerId !== req.user.id) {
    throw ApiError.forbidden("You do not have permission to update this application.");
  }

  await application.update({ status: req.body.status });
  res.status(200).json({ success: true, data: { application } });
});

// DELETE /api/applications/:id  (the candidate who owns it, or ADMIN) — withdraw
const withdrawApplication = asyncHandler(async (req, res) => {
  const application = await Application.findByPk(req.params.id);
  if (!application) throw ApiError.notFound("Application not found.");
  if (req.user.role !== "ADMIN" && application.candidateId !== req.user.id) {
    throw ApiError.forbidden("You do not have permission to withdraw this application.");
  }
  await application.destroy();
  res.status(204).send();
});

module.exports = {
  createApplication,
  listApplicationsForJob,
  listMyApplications,
  updateApplicationStatus,
  withdrawApplication,
};
