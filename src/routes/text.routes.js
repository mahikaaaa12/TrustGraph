const express = require('express');
const textController = require('../controllers/text.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router.post('/analyze', textController.analyzeText);

module.exports = router;
