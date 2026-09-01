const express = require("express");
const {
  createJob,
  listJobs,
  getJob,
  updateJob,
  deleteJob,
  listMyJobs,
} = require("../controllers/job.controller");
const {
  createJobSchema,
  updateJobSchema,
  listJobsQuerySchema,
} = require("../validators/job.validator");
const validate = require("../middleware/validate");
const { authenticate, authorize } = require("../middleware/auth");
const applicationRouter = require("./application.routes");

const router = express.Router();

/**
 * @openapi
 * /api/jobs:
 *   get:
 *     tags: [Jobs]
 *     summary: List job postings (public, supports search/filter/pagination)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Matches against title, company, description
 *       - in: query
 *         name: location
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP, REMOTE] }
 *       - in: query
 *         name: minSalary
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Paginated list of jobs }
 *   post:
 *     tags: [Jobs]
 *     summary: Create a job posting (EMPLOYER or ADMIN only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, company, description, location]
 *             properties:
 *               title: { type: string }
 *               company: { type: string }
 *               description: { type: string }
 *               location: { type: string }
 *               type: { type: string, enum: [FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP, REMOTE] }
 *               salaryMin: { type: integer }
 *               salaryMax: { type: integer }
 *     responses:
 *       201: { description: Job created }
 *       401: { description: Not authenticated }
 *       403: { description: Not authorized (wrong role) }
 */
router
  .route("/")
  .get(validate(listJobsQuerySchema, "query"), listJobs)
  .post(
    authenticate,
    authorize("EMPLOYER", "ADMIN"),
    validate(createJobSchema),
    createJob
  );

/**
 * @openapi
 * /api/jobs/mine:
 *   get:
 *     tags: [Jobs]
 *     summary: List jobs posted by the current employer
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of the employer's own jobs }
 */
router.get("/mine", authenticate, authorize("EMPLOYER", "ADMIN"), listMyJobs);

/**
 * @openapi
 * /api/jobs/{id}:
 *   get:
 *     tags: [Jobs]
 *     summary: Get a single job by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Job found }
 *       404: { description: Job not found }
 *   patch:
 *     tags: [Jobs]
 *     summary: Update a job (owner EMPLOYER or ADMIN only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Job updated }
 *       403: { description: Not the job owner }
 *       404: { description: Job not found }
 *   delete:
 *     tags: [Jobs]
 *     summary: Delete a job (owner EMPLOYER or ADMIN only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Job deleted }
 *       403: { description: Not the job owner }
 *       404: { description: Job not found }
 */
router
  .route("/:id")
  .get(getJob)
  .patch(
    authenticate,
    authorize("EMPLOYER", "ADMIN"),
    validate(updateJobSchema),
    updateJob
  )
  .delete(authenticate, authorize("EMPLOYER", "ADMIN"), deleteJob);

// Nested resource: /api/jobs/:jobId/applications
router.use("/:jobId/applications", applicationRouter);

module.exports = router;
