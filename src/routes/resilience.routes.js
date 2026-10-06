const express = require('express');
const resilienceController = require('../controllers/resilience.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const { analysisRateLimiter } = require('../middlewares/rateLimiter.middleware');

const router = express.Router();

router.use(protect, restrictTo('INDUSTRY_ANALYST', 'ADMIN'));

router.post('/simulate-failure', analysisRateLimiter, resilienceController.simulateFailure);
router.get('/audit-logs', resilienceController.getAuditLogs);

module.exports = router;
