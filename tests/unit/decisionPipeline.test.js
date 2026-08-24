const DecisionPipelineService = require('../../src/services/decisionPipeline.service');
const PolicyEngineService = require('../../src/services/policyEngine.service');

describe('DecisionPipelineService Unit & Integration Tests', () => {
  it('should output ALLOW decision for clean low-risk transaction', async () => {
    const cleanTx = {
      transactionAmount: 45.0,
      transactionVelocity: 1,
      failedAttempts: 0,
      accountAge: 365,
      ipRisk: 0.05,
      countryMismatch: 0,
      sharedDeviceCount: 1,
      sharedIpCount: 1,
    };

    const result = await DecisionPipelineService.evaluateDecision(cleanTx);

    expect(result.decision).toBe('ALLOW');
    expect(result.riskScore).toBeLessThan(40.0);
    expect(result.expectedLoss).toBeLessThan(10.0);
    expect(result.policyVersion).toBe('policies-v1.2.0');
    expect(result.topRiskFactors.length).toBeGreaterThan(0);
    expect(result.topRiskFactors[0]).toHaveProperty('direction');
    expect(result.topRiskFactors[0]).toHaveProperty('humanReadableExplanation');
  });

  it('should output REVIEW decision for moderate expected loss or shared device cluster', async () => {
    const reviewTx = {
      transactionAmount: 75.0,
      transactionVelocity: 2,
      failedAttempts: 0,
      accountAge: 120,
      sharedDeviceCount: 3, // Triggers POL-REVIEW-002: Shared Device Sybil Cluster
    };

    const result = await DecisionPipelineService.evaluateDecision(reviewTx);

    expect(result.decision).toBe('REVIEW');
    expect(result.decisionReason).toContain('Triggered by');
    expect(result.policyEvaluation.matchedRulesCount).toBeGreaterThan(0);
  });

  it('should output BLOCK decision for severe expected loss or critical phishing/collusion', async () => {
    const criticalTx = {
      transactionAmount: 8500.0,
      transactionVelocity: 15,
      failedAttempts: 6,
      accountAge: 1,
      ipRisk: 0.95,
      countryMismatch: 1,
      piiLeaks: 4, // Triggers critical PII blocker
    };

    const result = await DecisionPipelineService.evaluateDecision(criticalTx);

    expect(result.decision).toBe('BLOCK');
    expect(result.riskScore).toBeGreaterThan(60.0);
    expect(result.policyEvaluation.triggeredPolicy.action).toBe('BLOCK');
  });

  it('should handle missing fields and invalid transaction amounts gracefully', async () => {
    const invalidTx = {
      transactionAmount: -500, // Invalid negative amount -> sanitized to 0.0
      // All other fields missing
    };

    const result = await DecisionPipelineService.evaluateDecision(invalidTx);

    expect(result.transactionTelemetry.amount).toBe(0.0);
    expect(result.expectedLoss).toBe(0.0);
    expect(['ALLOW', 'REVIEW', 'BLOCK']).toContain(result.decision);
  });

  it('should enforce safety fallback rule to REVIEW when ML model is unavailable and amount > $50', async () => {
    const fallbackOutcome = PolicyEngineService.evaluatePolicies({
      isFallback: true,
      amount: 150.0,
      fraudProbability: 0.2,
      riskScore: 20,
    });

    expect(fallbackOutcome.decision).toBe('REVIEW');
    expect(fallbackOutcome.decisionReason).toContain('ML');
  });
});
