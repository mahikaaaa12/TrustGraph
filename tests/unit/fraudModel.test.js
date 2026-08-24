const { FraudModel, defaultFraudModel } = require('../../src/ml/fraudModel');
const FeatureExtractor = require('../../src/ml/featureExtractor');

describe('FraudModel ML Inference Unit Tests', () => {
  describe('FeatureExtractor', () => {
    it('should extract and bound all normalized features into [0, 1] range', () => {
      const rawInputs = {
        authenticityScore: 90,
        securityScore: 85,
        metadataScore: 80,
        reputationScore: 95,
        piiLeaks: 3,
        phishingLikelihood: 0.8,
        imageTampered: true,
        aiLikelihood: 0.4,
        suspiciousDomain: true,
        socialEngLikelihood: 0.7,
        amount: 5000,
        velocity: 10,
      };

      const features = FeatureExtractor.extractFeatures(rawInputs);

      expect(features.authenticityDeficit).toBeCloseTo(0.10, 2);
      expect(features.securityVulnerability).toBeCloseTo(0.15, 2);
      expect(features.piiLeakSeverity).toBeGreaterThan(0);
      expect(features.imageTamperEvidence).toBe(1.0);
      expect(features.domainSuspicion).toBe(1.0);
      expect(features.phishingProbability).toBe(0.8);
      expect(features.amountAnomaly).toBeGreaterThan(0);
      expect(features.velocitySurge).toBe(0.5);
    });
  });

  describe('predict()', () => {
    it('should assign LOW risk and high trust score to clean multi-modal inputs', () => {
      const cleanInputs = {
        authenticityScore: 95,
        securityScore: 95,
        metadataScore: 90,
        reputationScore: 95,
        piiLeaks: 0,
        phishingLikelihood: 0,
        imageTampered: false,
        aiLikelihood: 0,
        suspiciousDomain: false,
        socialEngLikelihood: 0,
      };

      const prediction = defaultFraudModel.predict(cleanInputs);

      expect(prediction.fraudProbability).toBeLessThan(0.20);
      expect(prediction.trustScore).toBeGreaterThan(80.0);
      expect(prediction.riskTier).toBe('LOW');
      expect(prediction).toHaveProperty('featureContributions');
      expect(Array.isArray(prediction.featureContributions)).toBe(true);
    });

    it('should assign HIGH/CRITICAL risk to malicious inputs with phishing and PII leaks', () => {
      const maliciousInputs = {
        authenticityScore: 20,
        securityScore: 15,
        metadataScore: 25,
        reputationScore: 10,
        piiLeaks: 5,
        phishingLikelihood: 0.95,
        imageTampered: true,
        aiLikelihood: 0.3,
        suspiciousDomain: true,
        socialEngLikelihood: 0.9,
      };

      const prediction = defaultFraudModel.predict(maliciousInputs);

      expect(prediction.fraudProbability).toBeGreaterThan(0.70);
      expect(prediction.trustScore).toBeLessThan(35.0);
      expect(['HIGH', 'CRITICAL']).toContain(prediction.riskTier);
    });

    it('should correctly execute sigmoid mathematical boundaries', () => {
      expect(FraudModel.sigmoid(0)).toBe(0.5);
      expect(FraudModel.sigmoid(50)).toBe(1.0);
      expect(FraudModel.sigmoid(-50)).toBe(0.0);
    });
  });
});
