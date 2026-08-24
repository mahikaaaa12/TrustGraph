const express = require('express');
const authController = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');

const { authRateLimiter } = require('../middlewares/rateLimiter.middleware');

const router = express.Router();

// Public Authentication Endpoints (Protected by sliding window rate limiter)
router.post('/signup', authRateLimiter, authController.signup);
router.post('/login', authRateLimiter, authController.login);
router.post('/forgot-password', authRateLimiter, authController.forgotPassword);
router.patch('/reset-password/:resetToken', authRateLimiter, authController.resetPassword);

// Protected Authentication Endpoints
router.get('/me', protect, authController.getMe);

module.exports = router;
