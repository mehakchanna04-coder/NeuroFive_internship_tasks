const { ZodError } = require("zod");
const ApiError = require("../utils/ApiError");

/**
 * Validates req[part] (default "body") against a Zod schema.
 * On success, replaces req[part] with the parsed (and type-coerced) data.
 * On failure, forwards a 400 ApiError with field-level details.
 */
const validate = (schema, part = "body") => (req, res, next) => {
  try {
    const parsed = schema.parse(req[part]);
    req[part] = parsed;
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const details = err.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return next(ApiError.badRequest("Validation failed.", details));
    }
    next(err);
  }
};

module.exports = validate;
