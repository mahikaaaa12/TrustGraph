const express = require('express');
const feedbackController = require('../controllers/feedback.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router.post('/', feedbackController.submitFeedback);
router.get('/', feedbackController.getFeedbackList);

module.exports = router;
