const PolicyEngineService = require('../../src/services/policyEngine.service');

describe('PolicyEngineService Unit Tests', () => {
  it('should block when critical PII leak rule is satisfied', () => {
    const context = { piiLeaks: 5, amount: 100, trustScore: 70 };
    const outcome = PolicyEngineService.evaluatePolicies(context);

    expect(outcome.decision).toBe('BLOCK');
    expect(outcome.triggeredPolicy.id).toBe('POL-BLOCK-001');
    expect(outcome.matchedRulesCount).toBeGreaterThan(0);
  });

  it('should evaluate custom policies accurately with comparison operators', () => {
    const custom = [
      {
        id: 'CUSTOM-01',
        name: 'High Amount Block',
        condition: { field: 'amount', operator: 'GREATER_THAN', value: 10000 },
        action: 'BLOCK',
        priority: 50,
      },
    ];

    const resultMatched = PolicyEngineService.evaluatePolicies({ amount: 15000 }, custom);
    expect(resultMatched.decision).toBe('BLOCK');

    const resultClean = PolicyEngineService.evaluatePolicies({ amount: 500 }, custom);
    expect(resultClean.decision).toBe('ALLOW');
  });
});
