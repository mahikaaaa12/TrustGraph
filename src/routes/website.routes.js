const express = require('express');
const websiteController = require('../controllers/website.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router.post('/analyze', websiteController.analyzeWebsite);

module.exports = router;
