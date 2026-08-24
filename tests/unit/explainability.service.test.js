const ExplainabilityService = require('../../src/services/explainability.service');

describe('ExplainabilityService Unit Tests', () => {
  it('should generate feature attributions, waterfall items, and counterfactuals', () => {
    const mockPrediction = {
      fraudProbability: 0.72,
      trustScore: 28.0,
      riskTier: 'HIGH',
      featureContributions: [
        { feature: 'phishingProbability', impact: 2.3, rawValue: 0.8 },
        { feature: 'piiLeakSeverity', impact: 1.8, rawValue: 0.6 },
        { feature: 'authenticityDeficit', impact: 1.2, rawValue: 0.5 },
      ],
      rawFeatures: { phishingProbability: 0.8, piiLeakSeverity: 0.6 },
    };

    const explanation = ExplainabilityService.generateExplanation(mockPrediction, {
      piiLeaks: 3,
      securityScore: 40,
    });

    expect(explanation).toHaveProperty('summary');
    expect(explanation.topRiskDrivers.length).toBeGreaterThan(0);
    expect(explanation.topRiskDrivers[0].feature).toBe('phishingProbability');
    expect(explanation.counterfactuals.length).toBeGreaterThan(0);
    expect(explanation.counterfactuals[0]).toHaveProperty('estimatedScoreImprovement');
    expect(explanation.waterfallBreakdown.length).toBe(3);
  });
});
