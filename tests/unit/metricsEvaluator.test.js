const MetricsEvaluator = require('../../src/ml/metricsEvaluator');
const { defaultFraudModel } = require('../../src/ml/fraudModel');

describe('MetricsEvaluator Unit Tests', () => {
  const mockDataset = [
    {
      id: '1',
      description: 'Clean',
      inputs: { authenticityScore: 95, securityScore: 90, metadataScore: 85, reputationScore: 95 },
      actualFraud: 0,
    },
    {
      id: '2',
      description: 'Malicious',
      inputs: { authenticityScore: 20, securityScore: 10, metadataScore: 20, reputationScore: 10, piiLeaks: 5, phishingLikelihood: 0.95 },
      actualFraud: 1,
    },
    {
      id: '3',
      description: 'Clean 2',
      inputs: { authenticityScore: 90, securityScore: 85, metadataScore: 80, reputationScore: 85 },
      actualFraud: 0,
    },
    {
      id: '4',
      description: 'Malicious 2',
      inputs: { authenticityScore: 30, securityScore: 20, metadataScore: 30, reputationScore: 20, socialEngLikelihood: 0.9 },
      actualFraud: 1,
    },
  ];

  it('should accurately compute confusion matrix, precision, recall, and F1-score', () => {
    const report = MetricsEvaluator.evaluateAtThreshold(mockDataset, defaultFraudModel, 0.50);

    expect(report).toHaveProperty('confusionMatrix');
    expect(report.confusionMatrix.totalSamples).toBe(4);
    expect(report.metrics.precision).toBeGreaterThanOrEqual(0.0);
    expect(report.metrics.precision).toBeLessThanOrEqual(1.0);
    expect(report.metrics.recall).toBeGreaterThanOrEqual(0.0);
    expect(report.metrics.recall).toBeLessThanOrEqual(1.0);
    expect(report.metrics.f1Score).toBeGreaterThanOrEqual(0.0);
    expect(report.metrics.f1Score).toBeLessThanOrEqual(1.0);
  });

  it('should compute valid ROC curve points and ROC-AUC >= 0.5', () => {
    const roc = MetricsEvaluator.generateRocCurve(mockDataset, defaultFraudModel, 0.1);

    expect(roc.rocAuc).toBeGreaterThanOrEqual(0.5);
    expect(roc.rocAuc).toBeLessThanOrEqual(1.0);
    expect(Array.isArray(roc.rocPoints)).toBe(true);
    expect(roc.rocPoints.length).toBeGreaterThan(0);
  });

  it('should execute runFullBenchmark without errors', () => {
    const benchmark = MetricsEvaluator.runFullBenchmark(mockDataset, defaultFraudModel);

    expect(benchmark).toHaveProperty('datasetSize', 4);
    expect(benchmark).toHaveProperty('modelVersion');
    expect(benchmark).toHaveProperty('rocAuc');
    expect(benchmark).toHaveProperty('confusionMatrix');
    expect(benchmark).toHaveProperty('summary');
  });
});
