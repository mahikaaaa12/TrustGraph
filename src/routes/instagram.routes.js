const express = require('express');
const instagramController = require('../controllers/instagram.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const { RateLimiter } = require('../middlewares/rateLimiter.middleware');

const router = express.Router();

// Rate limiter: 20 requests/min for Instagram API-consuming routes
const instagramRateLimiter = new RateLimiter(
  60 * 1000,
  20,
  'Instagram API rate limit exceeded. Please wait before making more requests.'
).middleware();

// ── Public routes (no JWT required) ──────────────────────────────────
// OAuth callback must be public — Meta redirects here without our JWT
router.get('/oauth/callback', instagramController.oauthCallback);
router.get('/callback', instagramController.oauthCallback);

// ── Authenticated routes (JWT & CONTENT_CREATOR / ADMIN required) ──────
router.use(protect, restrictTo('CONTENT_CREATOR', 'ADMIN'));

// Configuration status (no secrets exposed)
router.get('/config', instagramController.getConfigStatus);

// Initiate OAuth flow — redirects browser to Instagram
router.get('/oauth/connect', instagramController.initiateOAuth);
router.get('/connect', instagramController.initiateOAuth);

// Connection status & Profile info
router.get('/status', instagramController.getConnectionStatus);
router.get('/profile', instagramController.getConnectionStatus);

// Fetch user's recent media (live API or requires active connection)
router.get('/media', instagramRateLimiter, instagramController.getUserMedia);

// Analyze a selected Instagram post (live or manual)
router.post('/analyze', instagramRateLimiter, instagramController.analyzeInstagramContent);

// Disconnect (revoke token & delete connection)
router.delete('/disconnect', instagramController.disconnect);
router.post('/disconnect', instagramController.disconnect);

module.exports = router;
