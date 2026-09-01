const { z } = require("zod");

const jobTypeEnum = z.enum([
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERNSHIP",
  "REMOTE",
]);

const createJobSchema = z
  .object({
    title: z.string().trim().min(3).max(150),
    company: z.string().trim().min(2).max(150),
    description: z.string().trim().min(20, "Description must be at least 20 characters"),
    location: z.string().trim().min(2).max(150),
    type: jobTypeEnum.optional().default("FULL_TIME"),
    salaryMin: z.coerce.number().int().nonnegative().optional(),
    salaryMax: z.coerce.number().int().nonnegative().optional(),
  })
  .refine(
    (data) =>
      data.salaryMin === undefined ||
      data.salaryMax === undefined ||
      data.salaryMin <= data.salaryMax,
    { message: "salaryMin cannot be greater than salaryMax", path: ["salaryMin"] }
  );

const updateJobSchema = z
  .object({
    title: z.string().trim().min(3).max(150).optional(),
    company: z.string().trim().min(2).max(150).optional(),
    description: z.string().trim().min(20).optional(),
    location: z.string().trim().min(2).max(150).optional(),
    type: jobTypeEnum.optional(),
    salaryMin: z.coerce.number().int().nonnegative().optional(),
    salaryMax: z.coerce.number().int().nonnegative().optional(),
    isActive: z.coerce.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update.",
  });

const listJobsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  location: z.string().trim().optional(),
  type: jobTypeEnum.optional(),
  search: z.string().trim().optional(), // matches against title/company/description
  minSalary: z.coerce.number().int().nonnegative().optional(),
  isActive: z.coerce.boolean().optional(),
});

module.exports = { createJobSchema, updateJobSchema, listJobsQuerySchema };
