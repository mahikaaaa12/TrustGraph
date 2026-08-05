/**
 * Application-Wide Constants
 * 
 * Centralizing constants prevents hardcoding magic strings and numbers across the codebase,
 * ensuring high maintainability and consistent error/response messaging.
 */

const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
});

const NODE_ENV = Object.freeze({
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
});

const DEFAULT_CONFIG = Object.freeze({
  PORT: 3000,
  API_PREFIX: '/api/v1',
  MAX_JSON_BODY_SIZE: '10mb',
  MAX_URL_ENCODED_SIZE: '10mb',
});

const RESPONSE_MESSAGES = Object.freeze({
  SUCCESS: 'Operation completed successfully.',
  SERVER_ERROR: 'An internal server error occurred.',
  NOT_FOUND: 'Requested resource was not found.',
  UNAUTHORIZED: 'Authentication required. Access denied.',
  FORBIDDEN: 'You do not have permission to access this resource.',
  BAD_REQUEST: 'Invalid request payload or parameters.',
});

module.exports = {
  HTTP_STATUS,
  NODE_ENV,
  DEFAULT_CONFIG,
  RESPONSE_MESSAGES,
};

