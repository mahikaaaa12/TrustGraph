const { defaultFraudModel } = require('../ml/fraudModel');
const LossCalculatorService = require('./lossCalculator.service');
const PolicyEngineService = require('./policyEngine.service');
const GraphAnalysisService = require('./graphAnalysis.service');

/**
 * Transaction Risk & Attack Vector Simulator Service
 * Generates synthetic transaction telemetry streams for live defense testing.
 */
class SimulatorService {
  static SCENARIOS = Object.freeze({
    NORMAL_COMMERCE: 'NORMAL_COMMERCE',
    CARD_TESTING_BURST: 'CARD_TESTING_BURST',
    ACCOUNT_TAKEOVER: 'ACCOUNT_TAKEOVER',
    ABUSE_RING_COLLUSION: 'ABUSE_RING_COLLUSION',
    PHISHING_CREDENTIAL_DRAIN: 'PHISHING_CREDENTIAL_DRAIN',
  });

  /**
   * Generates a single transaction event based on scenario template.
   */
  static generateEvent(scenario = this.SCENARIOS.NORMAL_COMMERCE, index = 1) {
    const timestamp = new Date(Date.now() - (index * 15000)).toISOString();
    const id = `tx_sim_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`;

    switch (scenario) {
      case this.SCENARIOS.CARD_TESTING_BURST:
        return {
          id,
          timestamp,
          scenario,
          user: `user_${1000 + (index % 3)}`,
          amount: parseFloat((1.50 + Math.random() * 3.50).toFixed(2)),
          currency: 'USD',
          ipAddress: '198.51.100.42',
          deviceId: 'dev_bot_cluster_01',
          signals: {
            authenticityScore: 40,
            securityScore: 50,
            metadataScore: 35,
            reputationScore: 25,
            piiLeaks: 0,
            phishingLikelihood: 0.1,
            imageTampered: false,
            aiLikelihood: 0.0,
            suspiciousDomain: true,
            socialEngLikelihood: 0.0,
            amount: 3.50,
            velocity: 18,
          },
        };

      case this.SCENARIOS.ACCOUNT_TAKEOVER:
        return {
          id,
          timestamp,
          scenario,
          user: `user_vip_${200 + index}`,
          amount: parseFloat((4500 + Math.random() * 5000).toFixed(2)),
          currency: 'USD',
          ipAddress: '203.0.113.88',
          deviceId: `dev_unknown_vpn_${index}`,
          signals: {
            authenticityScore: 30,
            securityScore: 40,
            metadataScore: 45,
            reputationScore: 30,
            piiLeaks: 1,
            phishingLikelihood: 0.45,
            imageTampered: false,
            aiLikelihood: 0.1,
            suspiciousDomain: true,
            socialEngLikelihood: 0.65,
            amount: 7500,
            velocity: 8,
          },
        };

      case this.SCENARIOS.ABUSE_RING_COLLUSION:
        return {
          id,
          timestamp,
          scenario,
          user: `ring_member_${index % 5}`,
          beneficiary: `ring_member_${(index + 1) % 5}`,
          amount: parseFloat((800 + (index % 4) * 150).toFixed(2)),
          currency: 'USD',
          ipAddress: '192.0.2.77',
          deviceId: 'dev_shared_hub_99',
          signals: {
            authenticityScore: 35,
            securityScore: 45,
            metadataScore: 40,
            reputationScore: 30,
            piiLeaks: 0,
            phishingLikelihood: 0.2,
            imageTampered: false,
            aiLikelihood: 0.0,
            suspiciousDomain: false,
            socialEngLikelihood: 0.0,
            amount: 950,
            velocity: 12,
            ringCycleCount: 1,
          },
        };

      case this.SCENARIOS.PHISHING_CREDENTIAL_DRAIN:
        return {
          id,
          timestamp,
          scenario,
          user: `victim_${800 + index}`,
          amount: parseFloat((1200 + Math.random() * 800).toFixed(2)),
          currency: 'USD',
          ipAddress: '198.51.100.199',
          deviceId: `dev_phish_proxy_${index}`,
          signals: {
            authenticityScore: 25,
            securityScore: 20,
            metadataScore: 30,
            reputationScore: 15,
            piiLeaks: 3,
            phishingLikelihood: 0.95,
            imageTampered: false,
            aiLikelihood: 0.1,
            suspiciousDomain: true,
            socialEngLikelihood: 0.90,
            amount: 1500,
            velocity: 6,
          },
        };

      case this.SCENARIOS.NORMAL_COMMERCE:
      default:
        return {
          id,
          timestamp,
          scenario: this.SCENARIOS.NORMAL_COMMERCE,
          user: `customer_${5000 + index}`,
          amount: parseFloat((25.0 + Math.random() * 120.0).toFixed(2)),
          currency: 'USD',
          ipAddress: `198.51.100.${10 + (index % 50)}`,
          deviceId: `dev_legit_mobile_${index}`,
          signals: {
            authenticityScore: 92,
            securityScore: 90,
            metadataScore: 85,
            reputationScore: 95,
            piiLeaks: 0,
            phishingLikelihood: 0.0,
            imageTampered: false,
            aiLikelihood: 0.0,
            suspiciousDomain: false,
            socialEngLikelihood: 0.0,
            amount: 65,
            velocity: 1,
          },
        };
    }
  }

  /**
   * Executes a batch simulation run and returns full statistical & pipeline evaluations.
   */
  static runSimulation(scenario = this.SCENARIOS.NORMAL_COMMERCE, count = 20) {
    const events = [];
    let totalExpectedLoss = 0;
    let blockedCount = 0;
    let reviewCount = 0;
    let approvedCount = 0;
    let totalRiskProbability = 0;

    for (let i = 1; i <= count; i++) {
      const event = this.generateEvent(scenario, i);

      // Run ML Model
      const mlResult = defaultFraudModel.predict(event.signals);

      // Run Loss Calculator
      const lossResult = LossCalculatorService.calculateExpectedLoss(
        mlResult.fraudProbability,
        event.amount
      );

      // Run Policy Engine
      const policyResult = PolicyEngineService.evaluatePolicies({
        ...event.signals,
        amount: event.amount,
        trustScore: mlResult.trustScore,
        fraudProbability: mlResult.fraudProbability,
        ringCycleCount: event.signals.ringCycleCount || 0,
      });

      const finalAction = policyResult.triggeredPolicy ? policyResult.triggeredPolicy.action : lossResult.recommendedAction;

      if (finalAction === 'REJECT_BLOCK') blockedCount++;
      else if (finalAction === 'MANUAL_REVIEW' || finalAction === 'STEP_UP_KYC') reviewCount++;
      else approvedCount++;

      totalExpectedLoss += lossResult.expectedLossUSD;
      totalRiskProbability += mlResult.fraudProbability;

      events.push({
        event,
        prediction: mlResult,
        loss: lossResult,
        policy: policyResult,
        finalAction,
      });
    }

    const avgFraudProb = parseFloat((totalRiskProbability / count).toFixed(4));
    const avgTrustScore = parseFloat(((1 - avgFraudProb) * 100).toFixed(1));

    return {
      scenario,
      count,
      executedAt: new Date().toISOString(),
      summary: {
        totalVolumeUSD: parseFloat(events.reduce((sum, e) => sum + e.event.amount, 0).toFixed(2)),
        totalExpectedLossUSD: parseFloat(totalExpectedLoss.toFixed(2)),
        averageFraudProbability: avgFraudProb,
        averageTrustScore: avgTrustScore,
        blockedCount,
        reviewCount,
        approvedCount,
        mitigationRate: parseFloat((((blockedCount + reviewCount) / count) * 100).toFixed(1)),
      },
      events,
    };
  }
}

module.exports = SimulatorService;
