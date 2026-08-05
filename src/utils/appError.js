/**
 * Custom Operational Error Class
 * 
 * Used to distinguish operational, expected application errors (e.g. invalid credentials, 404s)
 * from unexpected internal programming bugs (e.g. null pointer reference exceptions).
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
