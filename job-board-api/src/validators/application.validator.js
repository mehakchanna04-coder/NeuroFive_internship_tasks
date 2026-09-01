const { z } = require("zod");

const createApplicationSchema = z.object({
  coverNote: z.string().trim().max(2000).optional(),
  resumeUrl: z.string().trim().url("resumeUrl must be a valid URL").optional(),
});

const updateApplicationStatusSchema = z.object({
  status: z.enum(["PENDING", "REVIEWED", "ACCEPTED", "REJECTED"]),
});

const listApplicationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  status: z.enum(["PENDING", "REVIEWED", "ACCEPTED", "REJECTED"]).optional(),
});

module.exports = {
  createApplicationSchema,
  updateApplicationStatusSchema,
  listApplicationsQuerySchema,
};
