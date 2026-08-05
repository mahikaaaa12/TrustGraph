const express = require('express');
const imageController = require('../controllers/image.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router.post('/analyze', imageController.analyzeImage);

module.exports = router;
