/**
 * Calibrated L2-Regularized Logistic Regression Risk Model
 */

class LogisticRegressionModel {
  constructor(featureNames = [], options = {}) {
    this.modelVersion = options.modelVersion || 'logreg-risk-v1.0.0';
    this.featureNames = featureNames;
    this.weights = options.weights || new Array(featureNames.length).fill(0.0);
    this.bias = options.bias !== undefined ? options.bias : 0.0;
    this.l2Penalty = options.l2Penalty || 0.001;
    this.threshold = options.threshold || 0.50;
    this.isTrained = !!options.isTrained;
  }

  static sigmoid(z) {
    if (z > 40) return 1.0;
    if (z < -40) return 0.0;
    return 1 / (1 + Math.exp(-z));
  }

  /**
   * Trains model using Mini-Batch Stochastic Gradient Descent with L2 regularization.
   */
  train(trainData, options = {}) {
    const epochs = options.epochs || 60;
    const lr0 = options.learningRate || 0.05;
    const batchSize = options.batchSize || 32;
    const decay = options.decay || 0.98;
    const l2 = this.l2Penalty;

    const n = trainData.length;
    const d = this.featureNames.length;

    this.weights = new Array(d).fill(0.0);
    this.bias = 0.0;

    let learningRate = lr0;
    const lossHistory = [];

    for (let epoch = 1; epoch <= epochs; epoch++) {
      // Shuffle indices
      const indices = Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5);
      let epochLoss = 0.0;

      for (let i = 0; i < n; i += batchSize) {
        const batchIndices = indices.slice(i, i + batchSize);
        const gradWeights = new Array(d).fill(0.0);
        let gradBias = 0.0;

        for (const idx of batchIndices) {
          const x = trainData[idx].featureVector;
          const y = trainData[idx].label;

          let z = this.bias;
          for (let j = 0; j < d; j++) {
            z += this.weights[j] * x[j];
          }

          const pred = LogisticRegressionModel.sigmoid(z);
          const error = pred - y;

          // Cross-entropy loss accumulation
          const pClamped = Math.max(1e-15, Math.min(1 - 1e-15, pred));
          epochLoss += - (y * Math.log(pClamped) + (1 - y) * Math.log(1 - pClamped));

          for (let j = 0; j < d; j++) {
            gradWeights[j] += error * x[j];
          }
          gradBias += error;
        }

        const bSize = batchIndices.length;
        for (let j = 0; j < d; j++) {
          this.weights[j] -= learningRate * ((gradWeights[j] / bSize) + l2 * this.weights[j]);
        }
        this.bias -= learningRate * (gradBias / bSize);
      }

      learningRate *= decay;
      lossHistory.push(parseFloat((epochLoss / n).toFixed(5)));
    }

    this.isTrained = true;
    return {
      epochsTrained: epochs,
      finalLoss: lossHistory[lossHistory.length - 1],
      lossHistory,
    };
  }

  /**
   * Predicts probability of fraud for a feature vector.
   */
  predictProbability(featureVector) {
    let z = this.bias;
    const d = Math.min(featureVector.length, this.weights.length);

    for (let j = 0; j < d; j++) {
      z += this.weights[j] * featureVector[j];
    }

    const prob = LogisticRegressionModel.sigmoid(z);
    return {
      probability: parseFloat(prob.toFixed(4)),
      rawLogit: parseFloat(z.toFixed(4)),
    };
  }

  /**
   * Computes feature contribution breakdown (SHAP/Logit decomposition).
   */
  getFeatureContributions(featureVector) {
    const contributions = [];
    const d = Math.min(featureVector.length, this.weights.length);

    for (let j = 0; j < d; j++) {
      const feat = this.featureNames[j];
      const impact = this.weights[j] * featureVector[j];
      contributions.push({
        feature: feat,
        weight: parseFloat(this.weights[j].toFixed(4)),
        featureValue: parseFloat(featureVector[j].toFixed(4)),
        impact: parseFloat(impact.toFixed(4)),
      });
    }

    // Sort by absolute impact descending
    return contributions.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  }

  toJSON() {
    return {
      modelType: 'LOGISTIC_REGRESSION',
      modelVersion: this.modelVersion,
      featureNames: this.featureNames,
      weights: this.weights.map((w) => parseFloat(w.toFixed(6))),
      bias: parseFloat(this.bias.toFixed(6)),
      l2Penalty: this.l2Penalty,
      threshold: this.threshold,
      isTrained: this.isTrained,
    };
  }

  static fromJSON(data) {
    return new LogisticRegressionModel(data.featureNames, {
      modelVersion: data.modelVersion,
      weights: data.weights,
      bias: data.bias,
      l2Penalty: data.l2Penalty,
      threshold: data.threshold,
      isTrained: data.isTrained,
    });
  }
}

module.exports = LogisticRegressionModel;
