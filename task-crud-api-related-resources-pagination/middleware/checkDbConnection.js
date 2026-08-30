const mongoose = require('mongoose');
const { sendError } = require('../utils/apiResponse');

// mongoose.connection.readyState: 0 = disconnected, 1 = connected,
// 2 = connecting, 3 = disconnecting
module.exports = function checkDbConnection(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return sendError(res, 503, 'Database unavailable, please try again shortly');
  }
  next();
};
