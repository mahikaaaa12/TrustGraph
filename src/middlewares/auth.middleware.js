const User = require('../models/User');
const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken } = require('../utils/jwt');
const { HTTP_STATUS, RESPONSE_MESSAGES } = require('../constants');

/**
 * Middleware: Protects routes by enforcing valid JWT authentication.
 */
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Extract Bearer token from HTTP Authorization Header or Query Parameter
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return next(new AppError(RESPONSE_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED));
  }

  // 2. Verify token signature and expiration
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    return next(new AppError('Invalid or expired authentication token.', HTTP_STATUS.UNAUTHORIZED));
  }

  // 3. Ensure user still exists in database
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user belonging to this token no longer exists.', HTTP_STATUS.UNAUTHORIZED));
  }

  // 4. Attach user instance to express request object for downstream controllers
  req.user = currentUser;
  next();
});

/**
 * Helper: Normalizes any role string to canonical enum value.
 */
function normalizeUserRole(roleStr) {
  if (!roleStr) return 'INDUSTRY_ANALYST';
  const upper = String(roleStr).trim().toUpperCase();
  if (upper === 'ADMIN') return 'ADMIN';
  if (upper === 'CONTENT_CREATOR' || upper === 'CREATOR') return 'CONTENT_CREATOR';
  if (upper === 'INDUSTRY_ANALYST' || upper === 'ANALYST' || upper === 'USER') return 'INDUSTRY_ANALYST';
  return 'INDUSTRY_ANALYST';
}

/**
 * Middleware: Restricts route access to specified user roles (Role-Based Access Control - RBAC).
 * Supports both restrictTo and requireRole export aliases.
 * ADMIN role inherently satisfies all role checks.
 */
const restrictTo = (...allowedRoles) => {
  const normalizedAllowed = allowedRoles.map((r) => normalizeUserRole(r));

  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(RESPONSE_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED));
    }

    const userRole = normalizeUserRole(req.user.role);

    // ADMIN role has full system access to all endpoints
    if (userRole === 'ADMIN') {
      return next();
    }

    if (!normalizedAllowed.includes(userRole)) {
      return next(new AppError('Access denied: Unauthorized role permission for this endpoint.', HTTP_STATUS.FORBIDDEN));
    }

    next();
  };
};

exports.restrictTo = restrictTo;
exports.requireRole = restrictTo;
