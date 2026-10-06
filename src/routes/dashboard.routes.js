const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboard.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');

router.use(protect);

router.get('/summary', restrictTo('INDUSTRY_ANALYST', 'ADMIN'), DashboardController.getSummary);
router.get('/creator-summary', restrictTo('CONTENT_CREATOR', 'ADMIN'), DashboardController.getCreatorSummary);

module.exports = router;
