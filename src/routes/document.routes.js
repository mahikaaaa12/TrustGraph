const express = require('express');
const documentController = require('../controllers/document.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router.post('/analyze', documentController.analyzeDocument);

module.exports = router;
