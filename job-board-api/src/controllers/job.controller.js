const { Op } = require("sequelize");
const { Job, User } = require("../models");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

// POST /api/jobs  (EMPLOYER, ADMIN)
const createJob = asyncHandler(async (req, res) => {
  const job = await Job.create({ ...req.body, employerId: req.user.id });
  res.status(201).json({ success: true, data: { job } });
});

// GET /api/jobs  (public) — search, filter, paginate
const listJobs = asyncHandler(async (req, res) => {
  const { page, limit, location, type, search, minSalary, isActive } = req.query;

  const where = {
    // Default to only active listings for public browsing, unless the
    // caller explicitly requests a value.
    isActive: isActive !== undefined ? isActive : true,
    ...(location && { location: { [Op.iLike]: `%${location}%` } }),
    ...(type && { type }),
    ...(minSalary !== undefined && { salaryMax: { [Op.gte]: minSalary } }),
    ...(search && {
      [Op.or]: [
        { title: { [Op.iLike]: `%${search}%` } },
        { company: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ],
    }),
  };

  const { rows: jobs, count: total } = await Job.findAndCountAll({
    where,
    offset: (page - 1) * limit,
    limit,
    order: [["createdAt", "DESC"]],
    include: [{ model: User, as: "employer", attributes: ["id", "name"] }],
  });

  res.status(200).json({
    success: true,
    data: { jobs },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

// GET /api/jobs/:id  (public)
const getJob = asyncHandler(async (req, res) => {
  const job = await Job.findByPk(req.params.id, {
    include: [{ model: User, as: "employer", attributes: ["id", "name"] }],
  });
  if (!job) throw ApiError.notFound("Job not found.");
  res.status(200).json({ success: true, data: { job } });
});

async function getOwnedJobOr403(jobId, user) {
  const job = await Job.findByPk(jobId);
  if (!job) throw ApiError.notFound("Job not found.");
  if (user.role !== "ADMIN" && job.employerId !== user.id) {
    throw ApiError.forbidden("You do not have permission to modify this job.");
  }
  return job;
}

// PATCH /api/jobs/:id  (EMPLOYER who owns it, or ADMIN)
const updateJob = asyncHandler(async (req, res) => {
  const job = await getOwnedJobOr403(req.params.id, req.user);
  await job.update(req.body);
  res.status(200).json({ success: true, data: { job } });
});

// DELETE /api/jobs/:id  (EMPLOYER who owns it, or ADMIN)
const deleteJob = asyncHandler(async (req, res) => {
  const job = await getOwnedJobOr403(req.params.id, req.user);
  await job.destroy();
  res.status(204).send();
});

// GET /api/jobs/mine  (EMPLOYER) — jobs posted by the current employer
const listMyJobs = asyncHandler(async (req, res) => {
  const jobs = await Job.findAll({
    where: { employerId: req.user.id },
    order: [["createdAt", "DESC"]],
  });
  res.status(200).json({ success: true, data: { jobs } });
});

module.exports = { createJob, listJobs, getJob, updateJob, deleteJob, listMyJobs };
