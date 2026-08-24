/**
 * Environment Variable Validator
 * Validates critical environment variables at startup and throws descriptive errors if misconfigured.
 */
function validateEnv() {
  const required = ['MONGODB_URI', 'JWT_SECRET'];
  const missing = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[Configuration Error] Missing required environment variable(s): ${missing.join(', ')}. Please check your .env file.`
    );
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 16) {
    console.warn('[Security Warning] JWT_SECRET is shorter than 16 characters. For production, use at least 32 characters.');
  }

  return true;
}

module.exports = { validateEnv };
