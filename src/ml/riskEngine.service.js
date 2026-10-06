const fs = require('fs');
const path = require('path');
const FeaturePipeline = require('./featurePipeline');
const LogisticRegressionModel = require('./logisticRegression');
const GradientBoostedTreesModel = require('./gradientBoostedTrees');
const TrainPipeline = require('./trainPipeline');
const ProbabilityCalibrator = require('./probabilityCalibrator');

/**
 * Enterprise Risk Inference Engine Service
 * Executes calibrated ML risk predictions, feature attributions, and loss calculations.
 */
class RiskEngineService {
  constructor() {
    this.artifactsDir = path.resolve(__dirname, './artifacts');
    this.scalerStats = null;
    this.gbdtModel = null;
    this.logRegModel = null;
    this.gbdtCalibrator = null;
    this.logRegCalibrator = null;
    this.comparisonReport = null;

    this.init();
  }

  init() {
    const scalerPath = path.join(this.artifactsDir, 'scaler-v1.json');
    const gbdtPath = path.join(this.artifactsDir, 'gbdt-risk-v1.json');
    const logregPath = path.join(this.artifactsDir, 'logreg-risk-v1.json');
    const compPath = path.join(this.artifactsDir, 'model-comparison-v1.json');
    const gbdtCalPath = path.join(this.artifactsDir, 'calibrator-gbdt-v1.json');
    const logregCalPath = path.join(this.artifactsDir, 'calibrator-logreg-v1.json');

    if (fs.existsSync(scalerPath) && fs.existsSync(gbdtPath) && fs.existsSync(logregPath)) {
      try {
        this.scalerStats = JSON.parse(fs.readFileSync(scalerPath, 'utf-8'));
        this.gbdtModel = GradientBoostedTreesModel.fromJSON(JSON.parse(fs.readFileSync(gbdtPath, 'utf-8')));
        this.logRegModel = LogisticRegressionModel.fromJSON(JSON.parse(fs.readFileSync(logregPath, 'utf-8')));
        if (fs.existsSync(gbdtCalPath)) {
          this.gbdtCalibrator = ProbabilityCalibrator.fromJSON(JSON.parse(fs.readFileSync(gbdtCalPath, 'utf-8')));
        }
        if (fs.existsSync(logregCalPath)) {
          this.logRegCalibrator = ProbabilityCalibrator.fromJSON(JSON.parse(fs.readFileSync(logregCalPath, 'utf-8')));
        }
        if (fs.existsSync(compPath)) {
          this.comparisonReport = JSON.parse(fs.readFileSync(compPath, 'utf-8'));
        }
        return;
      } catch (err) {
        console.warn('[RiskEngineService] Error loading artifacts, retraining...', err.message);
      }
    }

    // Auto-train and generate initial artifacts if missing
    this.retrainModels();
  }

  retrainModels(options = {}) {
    const pipelineResult = TrainPipeline.runPipeline(options);
    this.scalerStats = pipelineResult.scalerStats;
    this.gbdtModel = pipelineResult.gbdt;
    this.logRegModel = pipelineResult.logReg;
    this.comparisonReport = pipelineResult.report;
    return this.comparisonReport;
  }

  /**
   * Evaluates transaction risk using calibrated ML ensemble.
   * @param {Object} transactionData Raw transaction telemetry inputs
   * @param {string} modelChoice 'gbdt' (default) or 'logreg'
   */
  predictRisk(transactionData = {}, modelChoice = 'gbdt') {
    if (!this.gbdtModel || !this.scalerStats) {
      this.init();
    }

    const transformed = FeaturePipeline.transform(transactionData, this.scalerStats);
    const isLogReg = modelChoice.toLowerCase() === 'logreg';
    const model = isLogReg ? this.logRegModel : this.gbdtModel;
    const calibrator = isLogReg ? this.logRegCalibrator : this.gbdtCalibrator;

    const { probability } = model.predictProbability(transformed.featureVector);
    const rawFraudProbability = probability;
    const calibratedProbability = calibrator ? calibrator.calibrate(rawFraudProbability) : rawFraudProbability;

    const modelConfidence = parseFloat((Math.abs(calibratedProbability - 0.5) * 2.0).toFixed(4));
    const riskScore = parseFloat((calibratedProbability * 100).toFixed(1));
    const trustScore = parseFloat((Math.max(0, 100 - riskScore)).toFixed(1));

    const amount = Number(transformed.rawFeatures.transactionAmount) || 0.0;
    const expectedLoss = parseFloat((calibratedProbability * amount).toFixed(2));

    // Decision boundaries (for policy engine guidance)
    let recommendedAction = 'APPROVE';
    let riskTier = 'LOW';

    if (riskScore >= 75 || expectedLoss >= 500) {
      recommendedAction = 'REJECT_BLOCK';
      riskTier = 'CRITICAL';
    } else if (riskScore >= 50 || expectedLoss >= 150) {
      recommendedAction = 'MANUAL_REVIEW';
      riskTier = 'HIGH';
    } else if (riskScore >= 25 || expectedLoss >= 50) {
      recommendedAction = 'STEP_UP_KYC';
      riskTier = 'MEDIUM';
    }

    const topRiskFactors = model.getFeatureContributions(
      transformed.featureVector,
      transformed.rawFeatures
    );

    return {
      evaluatedAt: new Date().toISOString(),
      modelVersion: model.modelVersion,
      modelType: model.constructor.name,
      featureVersion: transformed.featureVersion,
      scalerVersion: 'scaler-v1.0.0',
      thresholdVersion: 'thresholds-v1.0.0',
      calibrationVersion: calibrator ? calibrator.calibrationVersion : 'none',
      fraudProbability: rawFraudProbability,
      calibratedProbability,
      modelConfidence,
      riskProbability: calibratedProbability,
      riskScore,
      trustScore,
      riskTier,
      transactionAmount: amount,
      expectedLoss,
      expectedLossUSD: expectedLoss,
      policyDecision: recommendedAction,
      recommendedAction,
      decisionThreshold: model.threshold,
      topRiskFactors: topRiskFactors.slice(0, 5),
      rawFeatures: transformed.rawFeatures,
    };
  }

  getModelComparison() {
    if (!this.comparisonReport) {
      this.retrainModels();
    }
    return this.comparisonReport;
  }
}

const defaultRiskEngine = new RiskEngineService();

module.exports = {
  RiskEngineService,
  defaultRiskEngine,
};
