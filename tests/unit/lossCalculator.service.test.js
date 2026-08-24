const LossCalculatorService = require('../../src/services/lossCalculator.service');

describe('LossCalculatorService Unit Tests', () => {
  it('should recommend APPROVE for low probability and low transaction amount', () => {
    const result = LossCalculatorService.calculateExpectedLoss(0.05, 50.0);

    expect(result.recommendedAction).toBe('APPROVE');
    expect(result.expectedLossUSD).toBeLessThan(5.0);
  });

  it('should recommend REJECT_BLOCK for high fraud probability or large expected loss', () => {
    const result = LossCalculatorService.calculateExpectedLoss(0.85, 1000.0);

    expect(result.recommendedAction).toBe('REJECT_BLOCK');
    expect(result.expectedLossUSD).toBeGreaterThan(250.0);
  });

  it('should recommend STEP_UP_KYC or MANUAL_REVIEW for moderate risk amounts', () => {
    const result = LossCalculatorService.calculateExpectedLoss(0.35, 300.0);

    expect(['STEP_UP_KYC', 'MANUAL_REVIEW']).toContain(result.recommendedAction);
    expect(result).toHaveProperty('costMatrix');
  });
});
