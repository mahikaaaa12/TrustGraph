const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboard.controller');
const { protect } = require('../middlewares/auth.middleware');

router.use(protect);

router.get('/summary', DashboardController.getSummary);

module.exports = router;
