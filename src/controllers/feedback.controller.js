const Feedback = require('../models/Feedback');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const { HTTP_STATUS } = require('../constants');

exports.submitFeedback = asyncHandler(async (req, res) => {
  const { analysisId, actualLabel, isCorrectPrediction, analystNotes } = req.body;

  if (!analysisId || !actualLabel || isCorrectPrediction === undefined) {
    throw new AppError('Please provide analysisId, actualLabel, and isCorrectPrediction boolean.', HTTP_STATUS.BAD_REQUEST);
  }

  const feedback = await Feedback.create({
    analysisId,
    userId: req.user._id,
    actualLabel,
    isCorrectPrediction,
    analystNotes: analystNotes || '',
  });

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Analyst ground-truth feedback recorded successfully for model retraining dataset.',
    data: feedback,
  });
});

exports.getFeedbackList = asyncHandler(async (req, res) => {
  const feedback = await Feedback.find()
    .populate('analysisId')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: feedback,
  });
});
