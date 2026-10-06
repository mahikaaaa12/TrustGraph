const express = require('express');
const graphController = require('../controllers/graph.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const { analysisRateLimiter } = require('../middlewares/rateLimiter.middleware');

const router = express.Router();

router.use(protect, restrictTo('INDUSTRY_ANALYST', 'ADMIN'));

router.get('/investigate/:entityId', analysisRateLimiter, graphController.investigateEntity);
router.post('/ingest-transaction', analysisRateLimiter, graphController.ingestTransaction);
router.post('/seed-demo', analysisRateLimiter, graphController.seedDemoGraph);

module.exports = router;
