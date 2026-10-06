/**
 * Probability Calibration Layer (Platt Scaling & ECE Calculation)
 * 
 * Maps uncalibrated model probabilities or logits to well-calibrated probabilities
 * that reflect true empirical fraud likelihoods.
 * 
 * Platt Scaling: P_calibrated(y=1 | s) = 1 / (1 + exp(A * logit(s) + B))
 */
class ProbabilityCalibrator {
  constructor(options = {}) {
    this.calibrationVersion = options.calibrationVersion || 'platt-v1.0.0';
    this.A = options.A !== undefined ? options.A : 1.0;
    this.B = options.B !== undefined ? options.B : 0.0;
    this.isFitted = !!options.isFitted;
  }

  static logit(p) {
    const clampedP = Math.max(1e-12, Math.min(1 - 1e-12, p));
    return Math.log(clampedP / (1 - clampedP));
  }

  static sigmoid(z) {
    if (z > 40) return 1.0;
    if (z < -40) return 0.0;
    return 1 / (1 + Math.exp(-z));
  }

  /**
   * Fits Platt Scaling parameters (A, B) using Validation Set raw predictions
   * @param {Array<{ probability: number, label: number }>} valDataset
   */
  fit(valDataset, options = {}) {
    const epochs = options.epochs || 100;
    const lr0 = options.learningRate || 0.05;

    let A = 1.0;
    let B = 0.0;

    const n = valDataset.length;
    if (n === 0) return this;

    for (let epoch = 1; epoch <= epochs; epoch++) {
      let gradA = 0;
      let gradB = 0;

      for (const item of valDataset) {
        const rawP = item.probability;
        const y = item.label;
        const s = ProbabilityCalibrator.logit(rawP);

        const pCal = ProbabilityCalibrator.sigmoid(A * s + B);
        const err = pCal - y;

        gradA += err * s;
        gradB += err;
      }

      A -= (lr0 / n) * gradA;
      B -= (lr0 / n) * gradB;
    }

    this.A = parseFloat(A.toFixed(6));
    this.B = parseFloat(B.toFixed(6));
    this.isFitted = true;

    return this;
  }

  /**
   * Calibrates a raw probability score.
   */
  calibrate(rawProbability) {
    if (!this.isFitted) return rawProbability;
    const s = ProbabilityCalibrator.logit(rawProbability);
    const calibrated = ProbabilityCalibrator.sigmoid(this.A * s + this.B);
    return parseFloat(Math.max(0.0, Math.min(1.0, calibrated)).toFixed(4));
  }

  /**
   * Calculates Expected Calibration Error (ECE) and Brier Score
   * @param {Array<{ probability: number, label: number }>} dataset
   * @param {number} numBins
   */
  static computeCalibrationMetrics(dataset, numBins = 10) {
    if (dataset.length === 0) {
      return { ece: 0.0, brierScore: 0.0, bins: [] };
    }

    // Calculate Brier Score: mean squared error of predicted probabilities vs binary labels
    let sumSquaredErr = 0;
    for (const item of dataset) {
      sumSquaredErr += Math.pow(item.probability - item.label, 2);
    }
    const brierScore = parseFloat((sumSquaredErr / dataset.length).toFixed(4));

    // Calculate ECE (Expected Calibration Error)
    const bins = Array.from({ length: numBins }, (_, i) => ({
      binIndex: i,
      minProb: i / numBins,
      maxProb: (i + 1) / numBins,
      count: 0,
      sumProb: 0,
      sumLabel: 0,
    }));

    for (const item of dataset) {
      const p = Math.max(0, Math.min(0.9999, item.probability));
      const binIdx = Math.floor(p * numBins);
      bins[binIdx].count++;
      bins[binIdx].sumProb += p;
      bins[binIdx].sumLabel += item.label;
    }

    let ece = 0.0;
    const binSummaries = [];

    for (const bin of bins) {
      if (bin.count > 0) {
        const avgConfidence = bin.sumProb / bin.count;
        const avgAccuracy = bin.sumLabel / bin.count;
        const gap = Math.abs(avgAccuracy - avgConfidence);
        ece += (bin.count / dataset.length) * gap;

        binSummaries.push({
          range: `${bin.minProb.toFixed(1)} - ${bin.maxProb.toFixed(1)}`,
          count: bin.count,
          avgConfidence: parseFloat(avgConfidence.toFixed(4)),
          avgAccuracy: parseFloat(avgAccuracy.toFixed(4)),
          gap: parseFloat(gap.toFixed(4)),
        });
      } else {
        binSummaries.push({
          range: `${bin.minProb.toFixed(1)} - ${bin.maxProb.toFixed(1)}`,
          count: 0,
          avgConfidence: 0.0,
          avgAccuracy: 0.0,
          gap: 0.0,
        });
      }
    }

    return {
      ece: parseFloat(ece.toFixed(4)),
      brierScore,
      bins: binSummaries,
    };
  }

  toJSON() {
    return {
      calibrationVersion: this.calibrationVersion,
      A: this.A,
      B: this.B,
      isFitted: this.isFitted,
    };
  }

  static fromJSON(json) {
    if (!json) return new ProbabilityCalibrator();
    return new ProbabilityCalibrator({
      calibrationVersion: json.calibrationVersion,
      A: json.A,
      B: json.B,
      isFitted: json.isFitted,
    });
  }
}

module.exports = ProbabilityCalibrator;
