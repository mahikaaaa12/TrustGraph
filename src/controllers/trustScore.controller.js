const TrustScoreService = require('../services/trustScore.service');
const MetricsEvaluator = require('../ml/metricsEvaluator');
const SimulatorService = require('../services/simulator.service');
const GraphAnalysisService = require('../services/graphAnalysis.service');
const { defaultModelMonitor } = require('../services/modelMonitor.service');
const asyncHandler = require('../utils/asyncHandler');
const { HTTP_STATUS } = require('../constants');

/**
 * Multi-Modal Trust Score Engine Controller
 */

exports.evaluateTrustScore = asyncHandler(async (req, res) => {
  const result = await TrustScoreService.evaluateTrustScore(req.body, req.user._id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Multi-modal Trust Score evaluation computed successfully.',
    data: result,
  });
});

exports.getModelBenchmark = asyncHandler(async (req, res) => {
  const benchmarkReport = MetricsEvaluator.runFullBenchmark();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Empirical model benchmark evaluation computed successfully.',
    data: benchmarkReport,
  });
});

exports.runTransactionSimulation = asyncHandler(async (req, res) => {
  const { scenario = 'NORMAL_COMMERCE', count = 20 } = req.body;
  const simulationResult = SimulatorService.runSimulation(scenario, Math.min(100, Math.max(1, Number(count) || 20)));

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: `Transaction stream simulation executed (${scenario}).`,
    data: simulationResult,
  });
});

exports.getModelHealth = asyncHandler(async (req, res) => {
  const healthReport = defaultModelMonitor.getHealthReport();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Model health and drift report retrieved.',
    data: healthReport,
  });
});

const { defaultRiskEngine } = require('../ml/riskEngine.service');

exports.predictRisk = asyncHandler(async (req, res) => {
  const { transactionData, modelChoice = 'gbdt' } = req.body;
  const prediction = defaultRiskEngine.predictRisk(transactionData || req.body, modelChoice);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Transaction risk prediction evaluated successfully.',
    data: prediction,
  });
});

exports.getModelComparison = asyncHandler(async (req, res) => {
  const comparison = defaultRiskEngine.getModelComparison();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Model comparison (Baseline Logistic Regression vs GBDT) retrieved.',
    data: comparison,
  });
});

const DecisionPipelineService = require('../services/decisionPipeline.service');

exports.evaluateDecision = asyncHandler(async (req, res) => {
  const decisionResult = await DecisionPipelineService.evaluateDecision(req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: `Risk decision computed: ${decisionResult.decision}`,
    data: decisionResult,
  });
});



