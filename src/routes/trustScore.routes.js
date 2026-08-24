const express = require('express');
const trustScoreController = require('../controllers/trustScore.controller');
const { protect } = require('../middlewares/auth.middleware');
const { analysisRateLimiter } = require('../middlewares/rateLimiter.middleware');
const { idempotencyMiddleware } = require('../middlewares/idempotency.middleware');

const router = express.Router();

router.use(protect);

router.post('/evaluate', analysisRateLimiter, idempotencyMiddleware, trustScoreController.evaluateTrustScore);
router.post('/decision', analysisRateLimiter, trustScoreController.evaluateDecision);
router.post('/predict-risk', analysisRateLimiter, trustScoreController.predictRisk);
router.get('/model-comparison', trustScoreController.getModelComparison);
router.get('/benchmark', trustScoreController.getModelBenchmark);
router.post('/simulate', analysisRateLimiter, trustScoreController.runTransactionSimulation);
router.get('/model-health', trustScoreController.getModelHealth);

module.exports = router;



