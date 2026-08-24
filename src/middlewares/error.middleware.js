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

  // Sanitize message to ensure no connection strings or credentials leak
  let sanitizedMessage = err.message || RESPONSE_MESSAGES.SERVER_ERROR;
  sanitizedMessage = sanitizedMessage.replace(/mongodb(\+srv)?:\/\/[^@]+@/gi, 'mongodb://[REDACTED_CREDENTIALS]@');

  // Specific database error classification
  if (err.name === 'MongooseServerSelectionError' || err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    err.statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE;
    sanitizedMessage = 'Database service temporarily unavailable. Operational in resilient memory fallback mode.';
  }

  if (process.env.NODE_ENV === NODE_ENV.DEVELOPMENT) {
    res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: sanitizedMessage,
      errorName: err.name,
      isOperational: Boolean(err.isOperational),
    });
  } else {
    // Production Mode: Hide internal stack details
    if (err.isOperational || err.statusCode < 500) {
      res.status(err.statusCode).json({
        success: false,
        status: err.status,
        message: sanitizedMessage,
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

