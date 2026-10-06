const express = require('express');
const textController = require('../controllers/text.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect, restrictTo('INDUSTRY_ANALYST', 'ADMIN'));

router.post('/analyze', textController.analyzeText);

module.exports = router;
