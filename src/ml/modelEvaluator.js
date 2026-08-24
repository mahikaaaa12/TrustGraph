/**
 * Comprehensive ML Model Evaluation & Cost-Sensitive Loss Metrics
 */

class ModelEvaluator {
  /**
   * Evaluates a model on a labeled dataset at a given decision threshold.
   */
  static evaluate(model, testDataset, threshold = 0.50, options = {}) {
    const fpCostFixed = options.fpCostFixed || 15.0; // Friction / customer review cost
    const chargebackFeeFixed = options.chargebackFeeFixed || 25.0; // Bank chargeback penalty

    let tp = 0;
    let fp = 0;
    let tn = 0;
    let fn = 0;

    let totalFinancialLoss = 0.0;
    let totalTransactionVolume = 0.0;

    const scoredSamples = [];

    for (const sample of testDataset) {
      const { probability } = model.predictProbability(sample.featureVector);
      const actual = sample.label;
      const predicted = probability >= threshold ? 1 : 0;
      const amount = Number(sample.rawFeatures?.transactionAmount ?? 50.0);

      totalTransactionVolume += amount;

      if (actual === 1 && predicted === 1) {
        tp++;
      } else if (actual === 0 && predicted === 1) {
        fp++;
        totalFinancialLoss += fpCostFixed; // False Positive friction cost
      } else if (actual === 0 && predicted === 0) {
        tn++;
      } else if (actual === 1 && predicted === 0) {
        fn++;
        totalFinancialLoss += (amount + chargebackFeeFixed); // Fraud loss + chargeback penalty
      }

      scoredSamples.push({
        probability,
        actual,
        predicted,
        amount,
      });
    }

    const total = testDataset.length || 1;
    const accuracy = (tp + tn) / total;
    const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0.0;
    const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0.0;
    const specificity = (tn + fp) > 0 ? tn / (tn + fp) : 0.0;
    const f1Score = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0.0;
    const falsePositiveRate = (fp + tn) > 0 ? fp / (fp + tn) : 0.0;
    const falseNegativeRate = (fn + tp) > 0 ? fn / (fn + tp) : 0.0;

    // Calculate ROC-AUC via numerical trapezoidal integration across probability thresholds
    const rocAuc = this.computeRocAuc(scoredSamples);

    return {
      modelVersion: model.modelVersion,
      modelType: model.constructor.name,
      threshold,
      sampleCount: total,
      confusionMatrix: {
        truePositives: tp,
        falsePositives: fp,
        trueNegatives: tn,
        falseNegatives: fn,
      },
      metrics: {
        accuracy: parseFloat(accuracy.toFixed(4)),
        precision: parseFloat(precision.toFixed(4)),
        recall: parseFloat(recall.toFixed(4)),
        specificity: parseFloat(specificity.toFixed(4)),
        f1Score: parseFloat(f1Score.toFixed(4)),
        falsePositiveRate: parseFloat(falsePositiveRate.toFixed(4)),
        falseNegativeRate: parseFloat(falseNegativeRate.toFixed(4)),
        rocAuc: parseFloat(rocAuc.toFixed(4)),
      },
      financialRisk: {
        totalTransactionVolume: parseFloat(totalTransactionVolume.toFixed(2)),
        totalFinancialLoss: parseFloat(totalFinancialLoss.toFixed(2)),
        lossRatePercent: parseFloat(((totalFinancialLoss / (totalTransactionVolume || 1)) * 100).toFixed(2)),
        assumedFpCostUSD: fpCostFixed,
        assumedChargebackFeeUSD: chargebackFeeFixed,
      },
    };
  }

  /**
   * Computes Area Under the ROC Curve using trapezoidal integration.
   */
  static computeRocAuc(scoredSamples) {
    const thresholds = [];
    for (let t = 0.0; t <= 1.01; t += 0.02) {
      thresholds.push(parseFloat(t.toFixed(2)));
    }

    const curvePoints = [];
    for (const thresh of thresholds) {
      let tp = 0;
      let fp = 0;
      let tn = 0;
      let fn = 0;

      for (const s of scoredSamples) {
        const pred = s.probability >= thresh ? 1 : 0;
        if (s.actual === 1 && pred === 1) tp++;
        else if (s.actual === 0 && pred === 1) fp++;
        else if (s.actual === 0 && pred === 0) tn++;
        else if (s.actual === 1 && pred === 0) fn++;
      }

      const tpr = (tp + fn) > 0 ? tp / (tp + fn) : 0;
      const fpr = (fp + tn) > 0 ? fp / (fp + tn) : 0;
      curvePoints.push({ threshold: thresh, fpr, tpr });
    }

    // Sort by FPR ascending
    curvePoints.sort((a, b) => a.fpr - b.fpr);

    let rocAuc = 0.0;
    for (let i = 1; i < curvePoints.length; i++) {
      const deltaFpr = curvePoints[i].fpr - curvePoints[i - 1].fpr;
      const avgTpr = (curvePoints[i].tpr + curvePoints[i - 1].tpr) / 2;
      rocAuc += deltaFpr * avgTpr;
    }

    return Math.max(0.5, Math.min(1.0, rocAuc));
  }

  /**
   * Finds the threshold that minimizes expected financial loss on a validation set.
   */
  static findOptimalThreshold(model, valDataset, options = {}) {
    let bestThreshold = 0.50;
    let minLoss = Infinity;
    let bestEvaluation = null;

    for (let t = 0.15; t <= 0.85; t += 0.05) {
      const thresh = parseFloat(t.toFixed(2));
      const evalResult = this.evaluate(model, valDataset, thresh, options);
      if (evalResult.financialRisk.totalFinancialLoss < minLoss) {
        minLoss = evalResult.financialRisk.totalFinancialLoss;
        bestThreshold = thresh;
        bestEvaluation = evalResult;
      }
    }

    return {
      optimalThreshold: bestThreshold,
      optimalEvaluation: bestEvaluation,
    };
  }
}

module.exports = ModelEvaluator;
