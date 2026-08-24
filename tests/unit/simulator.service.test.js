const SimulatorService = require('../../src/services/simulator.service');
const DecisionPipelineService = require('../../src/services/decisionPipeline.service');

describe('SimulatorService & Pipeline Integration Tests', () => {
  it('should run multi-event attack stream simulations and mitigate expected losses', () => {
    const simulation = SimulatorService.runSimulation('CARD_TESTING_BURST', 15);

    expect(simulation.scenario).toBe('CARD_TESTING_BURST');
    expect(simulation.events.length).toBe(15);
    expect(simulation.summary).toHaveProperty('totalVolumeUSD');
    expect(simulation.summary).toHaveProperty('totalExpectedLossUSD');
    expect(simulation.summary).toHaveProperty('mitigationRate');
  });

  it('should execute end-to-end single transaction simulation through the live decision pipeline', async () => {
    const singleTx = {
      transactionAmount: 1200.0,
      customerAge: 26,
      accountAge: 5,
      merchantAge: 40,
      failedAttempts: 4,
      transactionVelocity: 12,
      deviceAge: 2,
      deviceChanges: 3,
      ipRisk: 0.90,
      countryMismatch: 1,
      emailAge: 10,
      chargebackHistory: 2,
      refundRatio: 0.25,
      sharedDeviceCount: 4,
      sharedIpCount: 5,
    };

    const decision = await DecisionPipelineService.evaluateDecision(singleTx);

    expect(decision.decision).toBe('BLOCK');
    expect(decision.riskScore).toBeGreaterThan(60.0);
    expect(decision.expectedLoss).toBeGreaterThan(500.0);
    expect(decision.policyVersion).toBe('policies-v1.2.0');
    expect(decision.topRiskFactors.length).toBeGreaterThan(0);
    expect(decision.topRiskFactors[0]).toHaveProperty('direction');
  });
});
