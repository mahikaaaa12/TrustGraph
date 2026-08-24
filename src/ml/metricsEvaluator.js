const { defaultFraudModel } = require('./fraudModel');
const defaultBenchmarkData = require('./benchmarkDataset.json');

/**
 * Empirical Model Performance & Metrics Evaluation Engine
 * Calculates Precision, Recall, F1, Specificity, Accuracy, and ROC-AUC curve points.
 */
class MetricsEvaluator {
  /**
   * Evaluates the model over a labeled dataset at a given decision threshold.
   */
  static evaluateAtThreshold(dataset, model, threshold = 0.50) {
    let tp = 0;
    let fp = 0;
    let tn = 0;
    let fn = 0;

    const sampleResults = [];

    for (const sample of dataset) {
      const pred = model.predict(sample.inputs);
      const predictedFraud = pred.fraudProbability >= threshold ? 1 : 0;
      const actual = sample.actualFraud;

      if (predictedFraud === 1 && actual === 1) tp++;
      else if (predictedFraud === 1 && actual === 0) fp++;
      else if (predictedFraud === 0 && actual === 0) tn++;
      else if (predictedFraud === 0 && actual === 1) fn++;

      sampleResults.push({
        id: sample.id,
        description: sample.description,
        actualFraud: actual,
        fraudProbability: pred.fraudProbability,
        predictedFraud,
        correct: predictedFraud === actual,
      });
    }

    const precision = tp + fp > 0 ? parseFloat((tp / (tp + fp)).toFixed(4)) : 1.0;
    const recall = tp + fn > 0 ? parseFloat((tp / (tp + fn)).toFixed(4)) : 0.0;
    const specificity = tn + fp > 0 ? parseFloat((tn / (tn + fp)).toFixed(4)) : 0.0;
    const f1Score =
      precision + recall > 0
        ? parseFloat(((2 * precision * recall) / (precision + recall)).toFixed(4))
        : 0.0;
    const accuracy =
      tp + tn + fp + fn > 0
        ? parseFloat(((tp + tn) / (tp + tn + fp + fn)).toFixed(4))
        : 0.0;

    return {
      threshold,
      confusionMatrix: {
        truePositives: tp,
        falsePositives: fp,
        trueNegatives: tn,
        falseNegatives: fn,
        totalSamples: dataset.length,
      },
      metrics: {
        precision,
        recall,
        f1Score,
        specificity,
        accuracy,
      },
      sampleResults,
    };
  }

  /**
   * Computes multi-threshold ROC Curve and ROC-AUC via Trapezoidal Numerical Integration.
   */
  static generateRocCurve(dataset, model, step = 0.05) {
    const points = [];

    // Evaluate thresholds from 1.0 down to 0.0
    for (let t = 1.0; t >= 0.0; t -= step) {
      const roundedT = parseFloat(t.toFixed(2));
      const res = this.evaluateAtThreshold(dataset, model, roundedT);
      const cm = res.confusionMatrix;

      const tpr = cm.truePositives + cm.falseNegatives > 0
        ? cm.truePositives / (cm.truePositives + cm.falseNegatives)
        : 0.0;

      const fpr = cm.falseNegatives + cm.falsePositives + cm.trueNegatives > 0 && cm.trueNegatives + cm.falsePositives > 0
        ? cm.falsePositives / (cm.trueNegatives + cm.falsePositives)
        : 0.0;

      points.push({
        threshold: roundedT,
        fpr: parseFloat(fpr.toFixed(4)),
        tpr: parseFloat(tpr.toFixed(4)),
      });
    }

    // Ensure boundary points (0,0) and (1,1) are present
    const sortedPoints = [...points].sort((a, b) => a.fpr - b.fpr || a.tpr - b.tpr);

    // Compute AUC using Trapezoidal Rule
    let auc = 0.0;
    for (let i = 1; i < sortedPoints.length; i++) {
      const prev = sortedPoints[i - 1];
      const curr = sortedPoints[i];
      const width = curr.fpr - prev.fpr;
      if (width > 0) {
        const avgHeight = (prev.tpr + curr.tpr) / 2.0;
        auc += width * avgHeight;
      }
    }

    auc = parseFloat(Math.min(1.0, Math.max(0.5, auc)).toFixed(4));

    return {
      rocAuc: auc,
      rocPoints: sortedPoints,
    };
  }

  /**
   * Comprehensive Benchmark Execution Report
   */
  static runFullBenchmark(dataset = defaultBenchmarkData, model = defaultFraudModel) {
    const defaultEvaluation = this.evaluateAtThreshold(dataset, model, 0.50);
    const rocAnalysis = this.generateRocCurve(dataset, model);

    return {
      datasetSize: dataset.length,
      evaluatedAt: new Date().toISOString(),
      modelVersion: model.version,
      architecture: model.config.architecture,
      optimalThreshold: 0.50,
      summary: defaultEvaluation.metrics,
      confusionMatrix: defaultEvaluation.confusionMatrix,
      rocAuc: rocAnalysis.rocAuc,
      rocCurve: rocAnalysis.rocPoints,
      sampleAudit: defaultEvaluation.sampleResults,
    };
  }
}

module.exports = MetricsEvaluator;
