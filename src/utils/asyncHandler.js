/**
 * Async Handler Wrapper
 * 
 * Wraps express route handler functions to automatically catch async errors 
 * and pass them to the global Express error middleware (next(err)), eliminating boilerplate try-catch.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
