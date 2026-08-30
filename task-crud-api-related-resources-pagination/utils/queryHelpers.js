/**
 * Parses ?page= and ?limit= into safe numbers with sane defaults/bounds.
 * (Values are already validated by express-validator before this runs;
 * this just converts and clamps.)
 */
function parsePagination(query) {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (!Number.isInteger(page) || page < 1) page = 1;
  if (!Number.isInteger(limit) || limit < 1) limit = 10;
  if (limit > 100) limit = 100; // hard cap so nobody can request the whole collection at once

  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Turns a sortBy query param like "createdAt", "-createdAt", or "title"
 * into a Mongoose sort object, restricted to an allow-list of fields so
 * clients can't sort by arbitrary/internal fields.
 */
function parseSort(sortByRaw, allowedFields, defaultSort) {
  if (!sortByRaw) return defaultSort;

  const direction = sortByRaw.startsWith('-') ? -1 : 1;
  const field = sortByRaw.replace(/^-/, '');

  if (!allowedFields.includes(field)) return defaultSort;
  return { [field]: direction };
}

module.exports = { parsePagination, parseSort };
