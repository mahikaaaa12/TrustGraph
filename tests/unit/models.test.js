const LogisticRegressionModel = require('../../src/ml/logisticRegression');
const GradientBoostedTreesModel = require('../../src/ml/gradientBoostedTrees');
const ModelEvaluator = require('../../src/ml/modelEvaluator');

describe('ML Risk Models & Training Unit Tests', () => {
  const featureNames = ['f1', 'f2', 'f3'];
  const mockTrainData = [
    { featureVector: [-1.0, -1.0, -1.0], label: 0, rawFeatures: { transactionAmount: 20 } },
    { featureVector: [-0.8, -0.9, -0.7], label: 0, rawFeatures: { transactionAmount: 35 } },
    { featureVector: [1.2, 1.5, 1.3], label: 1, rawFeatures: { transactionAmount: 500 } },
    { featureVector: [1.4, 1.1, 1.6], label: 1, rawFeatures: { transactionAmount: 850 } },
    { featureVector: [-1.1, -0.8, -1.2], label: 0, rawFeatures: { transactionAmount: 15 } },
    { featureVector: [1.5, 1.8, 1.2], label: 1, rawFeatures: { transactionAmount: 1200 } },
  ];

  describe('LogisticRegressionModel', () => {
    it('should train and serialize/deserialize without loss of predictive parameters', () => {
      const model = new LogisticRegressionModel(featureNames, { l2Penalty: 0.01 });
      const trainMeta = model.train(mockTrainData, { epochs: 40, learningRate: 0.1 });

      expect(model.isTrained).toBe(true);
      expect(trainMeta.epochsTrained).toBe(40);

      const json = model.toJSON();
      const restored = LogisticRegressionModel.fromJSON(json);

      const testVec = [1.3, 1.4, 1.5];
      const p1 = model.predictProbability(testVec);
      const p2 = restored.predictProbability(testVec);

      expect(p1.probability).toBeCloseTo(p2.probability, 4);
      expect(p1.probability).toBeGreaterThan(0.5);
    });
  });

  describe('GradientBoostedTreesModel', () => {
    it('should train decision tree ensemble and compute feature importances', () => {
      const gbdt = new GradientBoostedTreesModel(featureNames, { nEstimators: 10, maxDepth: 2 });
      const trainMeta = gbdt.train(mockTrainData);

      expect(gbdt.isTrained).toBe(true);
      expect(gbdt.trees.length).toBe(10);
      expect(trainMeta.featureImportances).toBeDefined();

      const json = gbdt.toJSON();
      const restored = GradientBoostedTreesModel.fromJSON(json);

      const testVec = [1.3, 1.4, 1.5];
      const p1 = gbdt.predictProbability(testVec);
      const p2 = restored.predictProbability(testVec);

      expect(p1.probability).toBeCloseTo(p2.probability, 4);
    });
  });

  describe('ModelEvaluator', () => {
    it('should evaluate model and calculate cost-sensitive financial loss', () => {
      const gbdt = new GradientBoostedTreesModel(featureNames, { nEstimators: 10 });
      gbdt.train(mockTrainData);

      const evalResult = ModelEvaluator.evaluate(gbdt, mockTrainData, 0.50);

      expect(evalResult.metrics).toHaveProperty('accuracy');
      expect(evalResult.metrics).toHaveProperty('rocAuc');
      expect(evalResult.financialRisk).toHaveProperty('totalFinancialLoss');
      expect(evalResult.confusionMatrix.truePositives + evalResult.confusionMatrix.trueNegatives).toBeGreaterThan(0);
    });
  });
});
