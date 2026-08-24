const express = require('express');
const modelMonitorController = require('../controllers/modelMonitor.controller');
const { protect } = require('../middlewares/auth.middleware');
const { analysisRateLimiter } = require('../middlewares/rateLimiter.middleware');

const router = express.Router();

router.use(protect);

router.get('/dashboard', modelMonitorController.getDashboardMetrics);
router.post('/feedback', analysisRateLimiter, modelMonitorController.recordFeedback);
router.get('/compare', modelMonitorController.compareModels);
router.post('/evaluate-candidate', analysisRateLimiter, modelMonitorController.evaluateRetrainedCandidate);

module.exports = router;
