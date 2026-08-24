const DatasetGenerator = require('../../src/ml/datasetGenerator');

describe('DatasetGenerator Unit Tests', () => {
  it('should generate reproducible synthetic dataset with explicit metadata', () => {
    const dataset1 = DatasetGenerator.generateSyntheticDataset(100, 42);
    const dataset2 = DatasetGenerator.generateSyntheticDataset(100, 42);

    expect(dataset1.sampleCount).toBe(100);
    expect(dataset1.isSynthetic).toBe(true);
    expect(dataset1.datasetVersion).toBe('synthetic-tx-risk-v1.0.0');
    expect(dataset1.data[0].id).toBe(dataset2.data[0].id);
    expect(dataset1.data[0].transactionAmount).toBe(dataset2.data[0].transactionAmount);
    expect(dataset1.data[0].is_fraud).toBe(dataset2.data[0].is_fraud);
  });

  it('should accurately partition data into 70% train, 15% val, and 15% test splits without leakage', () => {
    const raw = DatasetGenerator.generateSyntheticDataset(200, 99).data;
    const splits = DatasetGenerator.trainValTestSplit(raw, 0.70, 0.15);

    expect(splits.train.length).toBe(140);
    expect(splits.val.length).toBe(30);
    expect(splits.test.length).toBe(30);

    const trainIds = new Set(splits.train.map((d) => d.id));
    const valIds = new Set(splits.val.map((d) => d.id));
    const testIds = new Set(splits.test.map((d) => d.id));

    // Ensure zero overlap / zero leakage between partitions
    for (const id of valIds) {
      expect(trainIds.has(id)).toBe(false);
    }
    for (const id of testIds) {
      expect(trainIds.has(id)).toBe(false);
      expect(valIds.has(id)).toBe(false);
    }
  });
});
