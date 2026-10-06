const express = require('express');
const feedbackController = require('../controllers/feedback.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect, restrictTo('INDUSTRY_ANALYST', 'ADMIN'));

router.post('/', feedbackController.submitFeedback);
router.get('/', feedbackController.getFeedbackList);

module.exports = router;
