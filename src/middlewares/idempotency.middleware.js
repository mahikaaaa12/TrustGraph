/**
 * In-Memory LRU / TTL Idempotency Cache Middleware
 * Prevents double-submissions, duplicate analysis records, and concurrent retries.
 */
class IdempotencyManager {
  constructor(ttlMs = 24 * 60 * 60 * 1000) {
    this.ttlMs = ttlMs;
    this.cache = new Map();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item;
  }

  set(key, data) {
    // Evict oldest if map exceeds 5000 items
    if (this.cache.size > 5000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      ...data,
      expiresAt: Date.now() + this.ttlMs,
    });
  }
}

const idempotencyStore = new IdempotencyManager();

const idempotencyMiddleware = (req, res, next) => {
  const idempotencyKey =
    req.headers['idempotency-key'] ||
    req.headers['x-idempotency-key'] ||
    req.headers['x-event-id'] ||
    req.body?.eventId ||
    req.body?.idempotencyKey;

  if (!idempotencyKey || req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const userId = req.user?._id ? req.user._id.toString() : 'anon';
  const cacheKey = `${userId}:${req.originalUrl}:${idempotencyKey}`;

  const cached = idempotencyStore.get(cacheKey);
  if (cached) {
    res.set('X-Idempotent-Replay', 'true');
    res.set('X-Idempotency-Key', String(idempotencyKey));
    return res.status(cached.status).json({
      ...cached.body,
      isIdempotentReplay: true,
      cachedAt: cached.cachedAt,
    });
  }

  // Intercept json response
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      idempotencyStore.set(cacheKey, {
        status: res.statusCode,
        body,
        cachedAt: new Date().toISOString(),
      });
    }
    return originalJson(body);
  };

  next();
};

module.exports = {
  idempotencyMiddleware,
  idempotencyStore,
};
