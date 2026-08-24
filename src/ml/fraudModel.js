const defaultModelWeights = require('./modelWeights.json');
const FeatureExtractor = require('./featureExtractor');

/**
 * Production-Grade Machine Learning Fraud & Risk Inference Engine
 * Evaluates feature vectors using a regularized logistic decision ensemble.
 */
class FraudModel {
  constructor(weightsConfig = defaultModelWeights) {
    this.config = weightsConfig;
    this.weights = weightsConfig.weights;
    this.intercept = weightsConfig.intercept;
    this.scaling = weightsConfig.scaling;
    this.version = weightsConfig.modelVersion;
    this.thresholds = weightsConfig.decisionThresholds;
  }

  /**
   * Sigmoid Activation Function
   */
  static sigmoid(z) {
    if (z < -45) return 0.0;
    if (z > 45) return 1.0;
    return 1.0 / (1.0 + Math.exp(-z));
  }

  /**
   * Executes ML Risk Prediction
   * @param {Object} rawInputs - Raw signals
   * @returns {Object} Prediction result with probability, risk tier, and feature contributions
   */
  predict(rawInputs) {
    const rawFeatures = FeatureExtractor.extractFeatures(rawInputs);
    const standardized = FeatureExtractor.standardize(rawFeatures, this.scaling);

    let logit = this.intercept;
    const contributions = {};
    const featureImportances = {};

    for (const [featureName, weight] of Object.entries(this.weights)) {
      const featureVal = standardized[featureName] !== undefined ? standardized[featureName] : 0;
      const contribution = featureVal * weight;
      logit += contribution;
      contributions[featureName] = parseFloat(contribution.toFixed(4));
      featureImportances[featureName] = parseFloat((Math.abs(weight) * (rawFeatures[featureName] || 0)).toFixed(4));
    }

    const fraudProbability = parseFloat(FraudModel.sigmoid(logit).toFixed(4));
    const trustScore = parseFloat(((1 - fraudProbability) * 100).toFixed(1));

    let riskTier = 'LOW';
    if (fraudProbability >= this.thresholds.critical) {
      riskTier = 'CRITICAL';
    } else if (fraudProbability >= this.thresholds.high) {
      riskTier = 'HIGH';
    } else if (fraudProbability >= this.thresholds.medium) {
      riskTier = 'MEDIUM';
    }

    // Sort feature contributions by magnitude for explainability
    const sortedContributors = Object.entries(contributions)
      .map(([name, score]) => ({ feature: name, impact: score, rawValue: rawFeatures[name] }))
      .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

    return {
      modelVersion: this.version,
      fraudProbability,
      trustScore,
      riskTier,
      rawLogit: parseFloat(logit.toFixed(4)),
      featureContributions: sortedContributors,
      rawFeatures,
      architecture: this.config.architecture,
      calibratedAt: this.config.trainedAt,
    };
  }
}

const defaultModelInstance = new FraudModel();

module.exports = {
  FraudModel,
  defaultFraudModel: defaultModelInstance,
};
