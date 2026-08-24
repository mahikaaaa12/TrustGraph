const FeaturePipeline = require('../../src/ml/featurePipeline');

describe('FeaturePipeline Unit Tests', () => {
  const mockTrainData = [
    { transactionAmount: 10, transactionVelocity: 1, ipRisk: 0.1 },
    { transactionAmount: 100, transactionVelocity: 5, ipRisk: 0.5 },
    { transactionAmount: 50, transactionVelocity: 2, ipRisk: 0.2 },
  ];

  it('should fit scaler statistics exclusively from training data', () => {
    const scalerStats = FeaturePipeline.fitScaler(mockTrainData);

    expect(scalerStats).toHaveProperty('mean');
    expect(scalerStats).toHaveProperty('std');
    expect(scalerStats.mean.transactionAmount).toBeCloseTo(53.333, 2);
    expect(scalerStats.sampleCount).toBe(3);
  });

  it('should handle missing values gracefully with default imputations', () => {
    const scalerStats = FeaturePipeline.fitScaler(mockTrainData);
    const incompleteInput = { transactionAmount: 250 }; // All other 18 features missing

    const transformed = FeaturePipeline.transform(incompleteInput, scalerStats);

    expect(transformed.featureVector.length).toBe(19);
    expect(transformed.rawFeatures.transactionVelocity).toBe(1); // Default velocity imputed
    expect(transformed.rawFeatures.ipRisk).toBe(0.1); // Default ipRisk imputed
    expect(transformed.featureVersion).toBe('features-v1.0.0');
  });

  it('should output deterministic feature ordering', () => {
    const scalerStats = FeaturePipeline.fitScaler(mockTrainData);
    const input = { transactionAmount: 80, transactionVelocity: 3, ipRisk: 0.4 };

    const t1 = FeaturePipeline.transform(input, scalerStats);
    const t2 = FeaturePipeline.transform(input, scalerStats);

    expect(t1.featureVector).toEqual(t2.featureVector);
  });
});
