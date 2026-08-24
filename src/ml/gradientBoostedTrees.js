/**
 * Gradient Boosted Decision Tree (GBDT) Risk Model Ensemble
 * 
 * Implements stochastic gradient boosting on binomial log-likelihood / cross-entropy loss
 * with shallow regression trees, learning rate shrinkage, and Newton-Raphson leaf updates.
 */

class DecisionTreeNode {
  constructor(options = {}) {
    this.featureIndex = options.featureIndex !== undefined ? options.featureIndex : null;
    this.splitValue = options.splitValue !== undefined ? options.splitValue : null;
    this.left = options.left || null;
    this.right = options.right || null;
    this.value = options.value !== undefined ? options.value : null; // Leaf value
    this.isLeaf = options.isLeaf !== undefined ? options.isLeaf : false;
  }

  predict(x) {
    if (this.isLeaf) return this.value;
    if (x[this.featureIndex] <= this.splitValue) {
      return this.left ? this.left.predict(x) : this.value;
    } else {
      return this.right ? this.right.predict(x) : this.value;
    }
  }

  toJSON() {
    if (this.isLeaf) {
      return { isLeaf: true, value: parseFloat(this.value.toFixed(6)) };
    }
    return {
      isLeaf: false,
      featureIndex: this.featureIndex,
      splitValue: parseFloat(this.splitValue.toFixed(6)),
      left: this.left ? this.left.toJSON() : null,
      right: this.right ? this.right.toJSON() : null,
    };
  }

  static fromJSON(data) {
    if (!data) return null;
    if (data.isLeaf) return new DecisionTreeNode({ isLeaf: true, value: data.value });
    return new DecisionTreeNode({
      isLeaf: false,
      featureIndex: data.featureIndex,
      splitValue: data.splitValue,
      left: DecisionTreeNode.fromJSON(data.left),
      right: DecisionTreeNode.fromJSON(data.right),
    });
  }
}

class GradientBoostedTreesModel {
  constructor(featureNames = [], options = {}) {
    this.modelVersion = options.modelVersion || 'gbdt-risk-v1.0.0';
    this.featureNames = featureNames;
    this.nEstimators = options.nEstimators || 25;
    this.maxDepth = options.maxDepth || 3;
    this.learningRate = options.learningRate || 0.10;
    this.l2Reg = options.l2Reg || 1.0;
    this.initialLogOdds = options.initialLogOdds || 0.0;
    this.trees = options.trees || [];
    this.featureImportances = options.featureImportances || {};
    this.threshold = options.threshold || 0.50;
    this.isTrained = !!options.isTrained;
  }

  static sigmoid(z) {
    if (z > 40) return 1.0;
    if (z < -40) return 0.0;
    return 1 / (1 + Math.exp(-z));
  }

  /**
   * Builds a regression tree to fit pseudo-residuals.
   */
  _buildTree(dataset, residuals, probs, depth = 0) {
    const n = dataset.length;

    // Base case: max depth or too few samples
    if (depth >= this.maxDepth || n < 8) {
      // Newton-Raphson leaf optimal step: sum(residuals) / (sum(p * (1-p)) + l2)
      let sumRes = 0;
      let sumHess = 0;
      for (let i = 0; i < n; i++) {
        sumRes += residuals[i];
        sumHess += probs[i] * (1 - probs[i]);
      }
      const leafValue = sumRes / (sumHess + this.l2Reg);
      return new DecisionTreeNode({ isLeaf: true, value: leafValue });
    }

    // Find best split across features
    let bestGain = -1;
    let bestFeature = -1;
    let bestSplit = 0;
    let bestLeftIndices = [];
    let bestRightIndices = [];

    const numFeatures = this.featureNames.length;

    for (let f = 0; f < numFeatures; f++) {
      // Collect values for feature f
      const featVals = dataset.map((d) => d.featureVector[f]);
      const minVal = Math.min(...featVals);
      const maxVal = Math.max(...featVals);
      if (minVal === maxVal) continue;

      // Test candidate split thresholds (quantiles / percentiles)
      for (let q = 1; q <= 6; q++) {
        const candidateSplit = minVal + (maxVal - minVal) * (q / 7);
        const leftIdx = [];
        const rightIdx = [];

        for (let i = 0; i < n; i++) {
          if (dataset[i].featureVector[f] <= candidateSplit) leftIdx.push(i);
          else rightIdx.push(i);
        }

        if (leftIdx.length < 4 || rightIdx.length < 4) continue;

        // Variance reduction gain
        const leftResMean = leftIdx.reduce((s, idx) => s + residuals[idx], 0) / leftIdx.length;
        const rightResMean = rightIdx.reduce((s, idx) => s + residuals[idx], 0) / rightIdx.length;
        const gain = leftIdx.length * Math.pow(leftResMean, 2) + rightIdx.length * Math.pow(rightResMean, 2);

        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = f;
          bestSplit = candidateSplit;
          bestLeftIndices = leftIdx;
          bestRightIndices = rightIdx;
        }
      }
    }

    if (bestGain <= 0 || bestLeftIndices.length === 0 || bestRightIndices.length === 0) {
      let sumRes = 0;
      let sumHess = 0;
      for (let i = 0; i < n; i++) {
        sumRes += residuals[i];
        sumHess += probs[i] * (1 - probs[i]);
      }
      return new DecisionTreeNode({ isLeaf: true, value: sumRes / (sumHess + this.l2Reg) });
    }

    // Record feature importance gain
    const featName = this.featureNames[bestFeature];
    this.featureImportances[featName] = (this.featureImportances[featName] || 0) + bestGain;

    const leftData = bestLeftIndices.map((i) => dataset[i]);
    const leftRes = bestLeftIndices.map((i) => residuals[i]);
    const leftProbs = bestLeftIndices.map((i) => probs[i]);

    const rightData = bestRightIndices.map((i) => dataset[i]);
    const rightRes = bestRightIndices.map((i) => residuals[i]);
    const rightProbs = bestRightIndices.map((i) => probs[i]);

    const leftNode = this._buildTree(leftData, leftRes, leftProbs, depth + 1);
    const rightNode = this._buildTree(rightData, rightRes, rightProbs, depth + 1);

    return new DecisionTreeNode({
      isLeaf: false,
      featureIndex: bestFeature,
      splitValue: bestSplit,
      left: leftNode,
      right: rightNode,
    });
  }

  /**
   * Trains GBDT ensemble on training dataset.
   */
  train(trainData) {
    const n = trainData.length;
    const y = trainData.map((d) => d.label);

    // 1. Initial base prediction: log-odds of positive class
    const posCount = y.filter((v) => v === 1).length;
    const prior = Math.max(0.01, Math.min(0.99, posCount / n));
    this.initialLogOdds = Math.log(prior / (1 - prior));

    const rawPredictions = new Array(n).fill(this.initialLogOdds);
    this.trees = [];
    this.featureImportances = {};
    for (const f of this.featureNames) this.featureImportances[f] = 0.0;

    const lossHistory = [];

    // 2. Boosting Iterations
    for (let m = 0; m < this.nEstimators; m++) {
      const probs = rawPredictions.map((f) => GradientBoostedTreesModel.sigmoid(f));
      const residuals = new Array(n);

      let currentLoss = 0;
      for (let i = 0; i < n; i++) {
        residuals[i] = y[i] - probs[i];
        const pClamped = Math.max(1e-15, Math.min(1 - 1e-15, probs[i]));
        currentLoss += - (y[i] * Math.log(pClamped) + (1 - y[i]) * Math.log(1 - pClamped));
      }
      lossHistory.push(parseFloat((currentLoss / n).toFixed(5)));

      // Fit regression tree to residuals
      const tree = this._buildTree(trainData, residuals, probs, 0);
      this.trees.push(tree);

      // Update predictions with shrinkage
      for (let i = 0; i < n; i++) {
        const step = tree.predict(trainData[i].featureVector);
        rawPredictions[i] += this.learningRate * step;
      }
    }

    // Normalize feature importances to sum to 1.0
    const totalGain = Object.values(this.featureImportances).reduce((a, b) => a + b, 0) || 1.0;
    for (const [k, v] of Object.entries(this.featureImportances)) {
      this.featureImportances[k] = parseFloat((v / totalGain).toFixed(4));
    }

    this.isTrained = true;
    return {
      nEstimatorsTrained: this.trees.length,
      finalLoss: lossHistory[lossHistory.length - 1],
      lossHistory,
      featureImportances: this.featureImportances,
    };
  }

  /**
   * Predicts probability of fraud for a feature vector.
   */
  predictProbability(featureVector) {
    let logOdds = this.initialLogOdds;

    for (const tree of this.trees) {
      logOdds += this.learningRate * tree.predict(featureVector);
    }

    const prob = GradientBoostedTreesModel.sigmoid(logOdds);
    return {
      probability: parseFloat(prob.toFixed(4)),
      rawLogOdds: parseFloat(logOdds.toFixed(4)),
    };
  }

  /**
   * Generates feature contribution attributions.
   */
  getFeatureContributions(featureVector, rawFeatures = {}) {
    const contributions = [];

    for (const feat of this.featureNames) {
      const importance = this.featureImportances[feat] || 0.0;
      const rawVal = rawFeatures[feat] !== undefined ? rawFeatures[feat] : 0;
      const impactScore = parseFloat((importance * (Math.abs(featureVector[this.featureNames.indexOf(feat)]) + 0.1)).toFixed(3));

      contributions.push({
        feature: feat,
        importance,
        rawValue: rawVal,
        impact: impactScore,
      });
    }

    return contributions.sort((a, b) => b.impact - a.impact);
  }

  toJSON() {
    return {
      modelType: 'GRADIENT_BOOSTED_TREES',
      modelVersion: this.modelVersion,
      featureNames: this.featureNames,
      nEstimators: this.nEstimators,
      maxDepth: this.maxDepth,
      learningRate: this.learningRate,
      initialLogOdds: parseFloat(this.initialLogOdds.toFixed(6)),
      featureImportances: this.featureImportances,
      threshold: this.threshold,
      trees: this.trees.map((t) => t.toJSON()),
      isTrained: this.isTrained,
    };
  }

  static fromJSON(data) {
    const trees = (data.trees || []).map((t) => DecisionTreeNode.fromJSON(t));
    return new GradientBoostedTreesModel(data.featureNames, {
      modelVersion: data.modelVersion,
      nEstimators: data.nEstimators,
      maxDepth: data.maxDepth,
      learningRate: data.learningRate,
      initialLogOdds: data.initialLogOdds,
      featureImportances: data.featureImportances,
      threshold: data.threshold,
      trees,
      isTrained: data.isTrained,
    });
  }
}

module.exports = GradientBoostedTreesModel;
