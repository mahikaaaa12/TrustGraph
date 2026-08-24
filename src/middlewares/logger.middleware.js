const logger = require('../config/logger');

/**
 * Redacts sensitive tokens, credentials, and parameters from log messages and URIs.
 */
function sanitizeLogUrl(rawUrl = '') {
  return rawUrl
    .replace(/(password|token|secret|key|authorization|jwt|apiKey)=[^&]+/gi, '$1=[REDACTED]')
    .replace(/bearer\s+[A-Za-z0-9-_.]+/gi, 'Bearer [REDACTED]');
}

/**
 * Express HTTP Request Logger Middleware powered by Winston
 * Logs HTTP Method, Request Path, Status Code, IP, and Response Latency (ms).
 * Strictly redacts credentials, passwords, and tokens.
 */
const httpLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const cleanUrl = sanitizeLogUrl(req.originalUrl || req.url);
    const message = `${req.method} ${cleanUrl} ${res.statusCode} - ${duration}ms [IP: ${req.ip}] [Agent: ${req.get('User-Agent') || 'Unknown'}]`;

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
