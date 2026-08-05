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

  // 1. Extract Bearer token from HTTP Authorization Header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
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
 * Middleware: Restricts route access to specified user roles (Role-Based Access Control - RBAC).
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError(RESPONSE_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN));
    }
    next();
  };
};
