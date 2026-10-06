const express = require('express');
const documentController = require('../controllers/document.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect, restrictTo('INDUSTRY_ANALYST', 'ADMIN'));

router.post('/analyze', documentController.analyzeDocument);

module.exports = router;
