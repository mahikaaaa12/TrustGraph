const logger = require('../config/logger');

/**
 * Express HTTP Request Logger Middleware powered by Winston
 * Logs HTTP Method, Request Path, Status Code, IP, and Response Latency (ms).
 */
const httpLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms [IP: ${req.ip}] [Agent: ${req.get('User-Agent') || 'Unknown'}]`;

    if (res.statusCode >= 500) {
      logger.error(message);
    } else if (res.statusCode >= 400) {
      logger.warn(message);
    } else {
      logger.http(message);
    }
  });

  next();
};

module.exports = httpLogger;
