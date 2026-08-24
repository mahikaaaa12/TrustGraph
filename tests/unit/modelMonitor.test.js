const { ModelMonitorService } = require('../../src/services/modelMonitor.service');
const ModelPromotionService = require('../../src/services/modelPromotion.service');

describe('ModelMonitorService & Governance Unit Tests', () => {
  let monitor;

  beforeEach(() => {
    monitor = new ModelMonitorService();
  });

  describe('1. Prediction Logging', () => {
    it('should log prediction telemetry with latency and decision', async () => {
      const entry = await monitor.logPrediction({
        predictionId: 'pred_test_001',
        modelVersion: 'gbdt-risk-v1.0.0',
        featureVersion: 'features-v1.0.0',
        riskProbability: 0.85,
        riskScore: 85.0,
        decision: 'BLOCK',
        inferenceLatencyMs: 3.2,
        sanitizedFeatures: { transactionAmount: 500, transactionVelocity: 8 },
      });

      expect(entry.predictionId).toBe('pred_test_001');
      expect(entry.actualLabel).toBe('UNLABELED');
      expect(entry.inferenceLatencyMs).toBe(3.2);
    });
  });

  describe('2. Reviewer Ground-Truth Feedback & Performance', () => {
    it('should record reviewer feedback and compute empirical metrics on labeled feedback', async () => {
      // 1. Log synthetic predictions
      await monitor.logPrediction({
        predictionId: 'pred_feed_1',
        riskProbability: 0.90,
        riskScore: 90.0,
      });
      await monitor.logPrediction({
        predictionId: 'pred_feed_2',
        riskProbability: 0.80,
        riskScore: 80.0,
      });
      await monitor.logPrediction({
        predictionId: 'pred_feed_3',
        riskProbability: 0.10,
        riskScore: 10.0,
      });

      // 2. Submit reviewer feedback
      await monitor.recordFeedback({
        predictionId: 'pred_feed_1',
        actualLabel: 'FRAUD',
        reviewer: 'analyst_alice',
        notes: 'Confirmed chargeback',
      });
      await monitor.recordFeedback({
        predictionId: 'pred_feed_2',
        actualLabel: 'FRAUD',
        reviewer: 'analyst_alice',
      });
      await monitor.recordFeedback({
        predictionId: 'pred_feed_3',
        actualLabel: 'LEGITIMATE',
        reviewer: 'analyst_bob',
      });

      // 3. Compute metrics on labeled feedback
      const performance = await monitor.computeFeedbackPerformance();

      expect(performance.status).toBe('CALCULATED');
      expect(performance.sampleCount).toBe(3);
      expect(performance.metrics.precision).toBe(1.0);
      expect(performance.metrics.recall).toBe(1.0);
      expect(performance.metrics.f1Score).toBe(1.0);
      expect(performance.confusionMatrix.truePositives).toBe(2);
      expect(performance.confusionMatrix.trueNegatives).toBe(1);
    });
  });

  describe('3. Population Stability Index (PSI) Drift Calculation', () => {
    it('should compute low PSI for stable feature distributions and classify drift level', () => {
      const baseline = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const stableCurrent = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

      const psi = monitor.computePsi(baseline, stableCurrent);
      expect(psi).toBeLessThan(0.05); // Normal stable distribution shift
    });

    it('should compute elevated PSI for significantly shifted feature distributions', () => {
      const baseline = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
      const shiftedCurrent = [120, 150, 200, 250, 300, 350, 400, 450, 500, 550];

      const psi = monitor.computePsi(baseline, shiftedCurrent);
      expect(psi).toBeGreaterThan(0.20);
    });
  });

  describe('4. Controlled Retraining & Model Promotion Safeguards', () => {
    it('should evaluate retrained candidate model without automatically replacing production model', () => {
      const evalResult = ModelPromotionService.evaluateRetrainedCandidate({
        sampleCount: 1500,
        seed: 7777,
        candidateVersion: 'gbdt-risk-v1.1.0-test',
      });

      expect(evalResult).toHaveProperty('promotionStatus');
      expect(evalResult).toHaveProperty('gatekeeperChecks');
      expect(evalResult.promotionEnacted).toBe(false); // Safety invariant
      expect(evalResult.candidateModel.version).toBe('gbdt-risk-v1.1.0-test');
      expect(evalResult.gatekeeperChecks.rocAucCheck).toHaveProperty('passed');
      expect(evalResult.gatekeeperChecks.f1ScoreCheck).toHaveProperty('passed');
      expect(evalResult.gatekeeperChecks.lossRatioCheck).toHaveProperty('passed');
    });
  });
});
