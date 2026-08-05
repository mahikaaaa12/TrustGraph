const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'trustgraph_default_jwt_secret_key_change_in_production_32bytes';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

/**
 * Generates a signed JWT for a given payload (user ID and role).
 */
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

/**
 * Verifies a JWT token string against the secret key.
 */
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

module.exports = {
  generateToken,
  verifyToken,
};
