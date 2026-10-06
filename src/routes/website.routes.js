const express = require('express');
const websiteController = require('../controllers/website.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect, restrictTo('INDUSTRY_ANALYST', 'ADMIN'));

router.post('/analyze', websiteController.analyzeWebsite);

module.exports = router;
