const express = require('express');
const ReportController = require('../controllers/report.controller');
const { protect } = require('../middlewares/auth.middleware');
const { analysisRateLimiter } = require('../middlewares/rateLimiter.middleware');

const router = express.Router();

router.use(protect);

router.get('/', ReportController.getReports);
router.post('/', analysisRateLimiter, ReportController.createReport);
router.get('/:id', ReportController.getReportById);
router.get('/:id/export', ReportController.exportReport);

module.exports = router;
