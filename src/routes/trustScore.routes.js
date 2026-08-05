const express = require('express');
const trustScoreController = require('../controllers/trustScore.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router.post('/evaluate', trustScoreController.evaluateTrustScore);

module.exports = router;
