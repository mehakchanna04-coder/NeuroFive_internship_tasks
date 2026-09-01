const express = require("express");
const {
  createApplication,
  listApplicationsForJob,
  listMyApplications,
  updateApplicationStatus,
  withdrawApplication,
} = require("../controllers/application.controller");
const {
  createApplicationSchema,
  updateApplicationStatusSchema,
  listApplicationsQuerySchema,
} = require("../validators/application.validator");
const validate = require("../middleware/validate");
const { authenticate, authorize } = require("../middleware/auth");

// mergeParams lets us read :jobId when mounted under /api/jobs/:jobId/applications
const router = express.Router({ mergeParams: true });

/**
 * @openapi
 * /api/jobs/{jobId}/applications:
 *   post:
 *     tags: [Applications]
 *     summary: Apply to a job (CANDIDATE only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               coverNote: { type: string }
 *               resumeUrl: { type: string }
 *     responses:
 *       201: { description: Application submitted }
 *       409: { description: Already applied to this job }
 *   get:
 *     tags: [Applications]
 *     summary: List applications for a job (job owner EMPLOYER or ADMIN only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, REVIEWED, ACCEPTED, REJECTED] }
 *     responses:
 *       200: { description: Paginated list of applications for the job }
 *       403: { description: Not the job owner }
 */
router
  .route("/")
  .post(
    authenticate,
    authorize("CANDIDATE"),
    validate(createApplicationSchema),
    createApplication
  )
  .get(
    authenticate,
    authorize("EMPLOYER", "ADMIN"),
    validate(listApplicationsQuerySchema, "query"),
    listApplicationsForJob
  );

module.exports = router;

// --- Standalone router mounted at /api/applications (see app.js) ---
const standalone = express.Router();

/**
 * @openapi
 * /api/applications/mine:
 *   get:
 *     tags: [Applications]
 *     summary: List the current candidate's own applications
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of applications submitted by the current user }
 */
standalone.get(
  "/mine",
  authenticate,
  authorize("CANDIDATE", "ADMIN"),
  listMyApplications
);

/**
 * @openapi
 * /api/applications/{id}/status:
 *   patch:
 *     tags: [Applications]
 *     summary: Update an application's status (job owner EMPLOYER or ADMIN only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [PENDING, REVIEWED, ACCEPTED, REJECTED] }
 *     responses:
 *       200: { description: Application updated }
 *       403: { description: Not the job owner }
 */
standalone.patch(
  "/:id/status",
  authenticate,
  authorize("EMPLOYER", "ADMIN"),
  validate(updateApplicationStatusSchema),
  updateApplicationStatus
);

/**
 * @openapi
 * /api/applications/{id}:
 *   delete:
 *     tags: [Applications]
 *     summary: Withdraw an application (owning candidate or ADMIN only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Application withdrawn }
 *       403: { description: Not the owning candidate }
 */
standalone.delete("/:id", authenticate, authorize("CANDIDATE", "ADMIN"), withdrawApplication);

module.exports.standalone = standalone;
