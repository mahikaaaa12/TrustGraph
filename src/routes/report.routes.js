const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/report.controller');
const { protect } = require('../middlewares/auth.middleware');

router.use(protect);

router.get('/', ReportController.getReports);
router.get('/:id', ReportController.getReportById);
router.post('/', ReportController.createReport);

module.exports = router;
