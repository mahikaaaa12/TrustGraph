const express = require('express');
const modelMonitorController = require('../controllers/modelMonitor.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const { analysisRateLimiter } = require('../middlewares/rateLimiter.middleware');

const router = express.Router();

router.use(protect, restrictTo('ADMIN'));

router.get('/dashboard', modelMonitorController.getDashboardMetrics);
router.post('/feedback', analysisRateLimiter, modelMonitorController.recordFeedback);
router.get('/compare', modelMonitorController.compareModels);
router.post('/evaluate-candidate', analysisRateLimiter, modelMonitorController.evaluateRetrainedCandidate);

module.exports = router;
