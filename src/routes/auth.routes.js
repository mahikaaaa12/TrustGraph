const express = require('express');
const authController = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');
const { authRateLimiter, analysisRateLimiter } = require('../middlewares/rateLimiter.middleware');

const router = express.Router();

// Public Authentication Endpoints
router.post('/signup', authRateLimiter, authController.signup);
router.post('/login', authRateLimiter, authController.login);
router.post('/forgot-password', authRateLimiter, authController.forgotPassword);
router.patch('/reset-password/:resetToken', authRateLimiter, authController.resetPassword);

// Protected Profile & Account Management Endpoints
router.get('/me', protect, authController.getMe);
router.patch('/me', protect, authController.updateProfile);
router.post('/change-password', protect, authRateLimiter, authController.changePassword);
router.patch('/preferences', protect, authController.updatePreferences);
router.get('/login-activity', protect, authController.getLoginActivity);
router.post('/delete-account', protect, authRateLimiter, authController.deleteAccount);

module.exports = router;
