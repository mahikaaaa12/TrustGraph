const { RiskEngineService } = require('../../src/ml/riskEngine.service');

describe('RiskEngineService Inference Unit Tests', () => {
  let riskEngine;

  beforeAll(() => {
    riskEngine = new RiskEngineService();
  });

  it('should evaluate low risk and APPROVE action for normal transaction parameters', () => {
    const cleanTx = {
      transactionAmount: 45.0,
      transactionFrequency: 2,
      transactionVelocity: 1,
      merchantAge: 500,
      customerAge: 32,
      failedAttempts: 0,
      accountAge: 365,
      deviceAge: 180,
      deviceChanges: 0,
      ipRisk: 0.05,
      countryMismatch: 0,
      emailAge: 400,
      refundRatio: 0.0,
      chargebackHistory: 0,
      previousFraudCount: 0,
      timeSincePrevTx: 400,
      unusualAmountRatio: 1.0,
      sharedDeviceCount: 1,
      sharedIpCount: 1,
    };

    const result = riskEngine.predictRisk(cleanTx, 'gbdt');

    expect(result.riskScore).toBeLessThan(40.0);
    expect(result.trustScore).toBeGreaterThan(60.0);
    expect(result.riskTier).toBe('LOW');
    expect(result.recommendedAction).toBe('APPROVE');
    expect(result).toHaveProperty('modelVersion');
    expect(result).toHaveProperty('topRiskFactors');
    expect(result.topRiskFactors.length).toBeGreaterThan(0);
  });

  it('should evaluate high risk and REJECT_BLOCK action for anomalous attack parameters', () => {
    const attackTx = {
      transactionAmount: 5200.0,
      transactionVelocity: 18,
      failedAttempts: 5,
      accountAge: 2,
      deviceAge: 1,
      deviceChanges: 4,
      ipRisk: 0.95,
      countryMismatch: 1,
      chargebackHistory: 3,
      sharedDeviceCount: 8,
      sharedIpCount: 12,
    };

    const result = riskEngine.predictRisk(attackTx, 'gbdt');

    expect(result.riskScore).toBeGreaterThan(50.0);
    expect(result.riskTier).toBe('CRITICAL');
    expect(result.recommendedAction).toBe('REJECT_BLOCK');
    expect(result.expectedLossUSD).toBeGreaterThan(500.0);
  });

  it('should support comparing Logistic Regression and GBDT models', () => {
    const comparison = riskEngine.getModelComparison();

    expect(comparison).toHaveProperty('models');
    expect(comparison.models).toHaveProperty('baseline_logistic_regression');
    expect(comparison.models).toHaveProperty('primary_gradient_boosted_trees');
    expect(comparison).toHaveProperty('winner');
  });
});
