const logger = require('../config/logger');
const { HTTP_STATUS, RESPONSE_MESSAGES, NODE_ENV } = require('../constants');

/**
 * Global Express Error Handling Middleware with Winston Logger Integration
 */
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  err.status = err.status || 'error';

  // Log error using Winston
  logger.error(`[Express Error] Path: ${req.originalUrl} | Status: ${err.statusCode} | Message: ${err.message}`, {
    stack: err.stack,
    ip: req.ip,
    user: req.user?._id || 'Unauthenticated',
  });

  if (process.env.NODE_ENV === NODE_ENV.DEVELOPMENT) {
    res.status(err.statusCode).json({
      success: false,
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  } else {
    // Production Mode: Hide internal stack details for non-operational errors
    if (err.isOperational) {
      res.status(err.statusCode).json({
        success: false,
        status: err.status,
        message: err.message,
      });
    } else {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        status: 'error',
        message: RESPONSE_MESSAGES.SERVER_ERROR,
      });
    }
  }
};

module.exports = globalErrorHandler;
