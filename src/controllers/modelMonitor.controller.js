const { defaultModelMonitor } = require('../services/modelMonitor.service');
const ModelPromotionService = require('../services/modelPromotion.service');
const { defaultRiskEngine } = require('../ml/riskEngine.service');
const asyncHandler = require('../utils/asyncHandler');
const { HTTP_STATUS } = require('../constants');

exports.getDashboardMetrics = asyncHandler(async (req, res) => {
  const metrics = await defaultModelMonitor.getDashboardMetrics();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Model monitoring dashboard metrics retrieved.',
    data: metrics,
  });
});

exports.recordFeedback = asyncHandler(async (req, res) => {
  const { predictionId, actualLabel, notes = '' } = req.body;
  const reviewer = req.user?.name || req.user?.email || 'security_analyst';

  const feedbackRecord = await defaultModelMonitor.recordFeedback({
    predictionId,
    actualLabel,
    reviewer,
    notes,
  });

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: `Feedback recorded: Marked prediction ${predictionId} as ${actualLabel}.`,
    data: feedbackRecord,
  });
});

exports.compareModels = asyncHandler(async (req, res) => {
  const comparison = defaultRiskEngine.getModelComparison();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Model version comparison report retrieved.',
    data: comparison,
  });
});

exports.evaluateRetrainedCandidate = asyncHandler(async (req, res) => {
  const { sampleCount = 2000, seed = 8888, candidateVersion = 'gbdt-risk-v1.1.0-candidate' } = req.body;

  const evaluationResult = ModelPromotionService.evaluateRetrainedCandidate({
    sampleCount,
    seed,
    candidateVersion,
  });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: `Candidate model evaluated: ${evaluationResult.promotionStatus}.`,
    data: evaluationResult,
  });
});
