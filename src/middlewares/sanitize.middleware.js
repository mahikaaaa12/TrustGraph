/**
 * Enterprise Input Sanitization Middleware
 * Defends against MongoDB operator injection ($gt, $ne, $where, $regex) and NoSQL attacks.
 */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Strip keys that start with '$' or contain '.'
    if (!key.startsWith('$') && !key.includes('.')) {
      sanitized[key] = sanitizeObject(value);
    }
  }
  return sanitized;
}

const mongoSanitizeMiddleware = (req, res, next) => {
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);
  next();
};

module.exports = {
  sanitizeObject,
  mongoSanitizeMiddleware,
};
