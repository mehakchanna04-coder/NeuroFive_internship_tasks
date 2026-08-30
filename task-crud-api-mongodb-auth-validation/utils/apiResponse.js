/**
 * Every API response uses this exact shape, success or failure:
 *   { success: true,  data: <payload> }
 *   { success: false, error: "message", details: [...] | undefined }
 *
 * Using these helpers everywhere means no controller can accidentally
 * return a differently-shaped response.
 */

function sendSuccess(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

function sendError(res, statusCode, message, details = null) {
  const body = { success: false, error: message };
  if (details) body.details = details;
  return res.status(statusCode).json(body);
}

module.exports = { sendSuccess, sendError };
