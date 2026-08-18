const express = require('express');
const router = express.Router();
const HistoryController = require('../controllers/history.controller');
const { protect } = require('../middlewares/auth.middleware');

router.use(protect);

router.get('/', HistoryController.getHistory);
router.get('/stats', HistoryController.getHistoryStats);
router.get('/:id', HistoryController.getAnalysisById);

module.exports = router;
