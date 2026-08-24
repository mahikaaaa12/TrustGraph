const { HTTP_STATUS } = require('../constants');

/**
 * In-Memory Sliding Window Rate Limiter Middleware
 */
class RateLimiter {
  constructor(windowMs = 60 * 1000, maxRequests = 100, message = 'Too many requests. Please try again later.') {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.message = message;
    this.hits = new Map();

    // Periodic cleanup of expired window buckets every 2 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, timestamps] of this.hits.entries()) {
        const valid = timestamps.filter((t) => now - t < this.windowMs);
        if (valid.length === 0) {
          this.hits.delete(key);
        } else {
          this.hits.set(key, valid);
        }
      }
    }, 2 * 60 * 1000).unref();
  }

  middleware() {
    return (req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
      const key = `${ip}:${req.baseUrl || req.path}`;
      const now = Date.now();

      const timestamps = this.hits.get(key) || [];
      const windowStart = now - this.windowMs;
      const recentHits = timestamps.filter((t) => t > windowStart);

      if (recentHits.length >= this.maxRequests) {
        const oldestHit = recentHits[0];
        const retryAfterSec = Math.ceil((oldestHit + this.windowMs - now) / 1000);

        res.set('Retry-After', String(retryAfterSec));
        res.set('X-RateLimit-Limit', String(this.maxRequests));
        res.set('X-RateLimit-Remaining', '0');
        res.set('X-RateLimit-Reset', String(Math.ceil((oldestHit + this.windowMs) / 1000)));

        return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
          success: false,
          status: 'fail',
          message: this.message,
          retryAfterSeconds: retryAfterSec,
        });
      }

      recentHits.push(now);
      this.hits.set(key, recentHits);

      res.set('X-RateLimit-Limit', String(this.maxRequests));
      res.set('X-RateLimit-Remaining', String(this.maxRequests - recentHits.length));

      next();
    };
  }
}

const generalRateLimiter = new RateLimiter(60 * 1000, 150, 'Too many requests across general API.').middleware();
const authRateLimiter = new RateLimiter(60 * 1000, 25, 'Too many authentication attempts. Please wait a minute before retrying.').middleware();
const analysisRateLimiter = new RateLimiter(60 * 1000, 40, 'Analysis compute rate limit exceeded.').middleware();

module.exports = {
  RateLimiter,
  generalRateLimiter,
  authRateLimiter,
  analysisRateLimiter,
};
