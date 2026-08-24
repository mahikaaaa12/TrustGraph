const FeaturePipeline = require('../ml/featurePipeline');
const { defaultRiskEngine } = require('../ml/riskEngine.service');
const { defaultGraphStore } = require('./graphStore.service');
const GraphEngineService = require('./graphEngine.service');
const PolicyEngineService = require('./policyEngine.service');
const { defaultRiskAudit } = require('./riskAudit.service');
const { defaultModelMonitor } = require('./modelMonitor.service');
const { defaultMlCircuitBreaker } = require('../utils/circuitBreaker');

/**
 * Enterprise Risk Decision Pipeline Service
 * 
 * Pipeline Flow:
 * Input
 *   ↓
 * Feature Engineering
 *   ↓
 * ML Risk Model (with Circuit Breaker)
 *   ↓
 * Risk Probability
 *   ↓
 * Graph Risk & Relational Signals
 *   ↓
 * Combined Risk & Expected Loss
 *   ↓
 * Explainability (Directional Feature Attributions)
 *   ↓
 * Deterministic Policy Engine
 *   ↓
 * ALLOW / REVIEW / BLOCK
 */
class DecisionPipelineService {
  /**
   * Generates human-readable explanation and directional attribution for any feature.
   */
  static formatFeatureExplanation(featureName, rawValue, impact) {
    const isRiskIncreasing = impact > 0;
    const direction = isRiskIncreasing ? 'increase_risk' : 'decrease_risk';

    let explanation = '';

    switch (featureName) {
      case 'failedAttempts':
        explanation = rawValue > 0
          ? `${rawValue} failed authorization attempt(s) observed in the recent session.`
          : 'Zero failed authentication attempts detected.';
        break;

      case 'transactionVelocity':
        explanation = rawValue > 5
          ? `High transaction velocity (${rawValue} actions/hr) exceeds baseline behavior.`
          : 'Transaction velocity is within normal limits.';
        break;

      case 'ipRisk':
        explanation = rawValue > 0.5
          ? `IP reputation score (${(rawValue * 100).toFixed(0)}%) indicates elevated proxy/VPN risk.`
          : 'IP address exhibits a clean historical reputation.';
        break;

      case 'countryMismatch':
        explanation = rawValue === 1
          ? 'Card issuing country does not match transaction IP geolocation.'
          : 'Card country matches IP geographic location.';
        break;

      case 'accountAge':
        explanation = rawValue < 7
          ? `Newly created account (${rawValue} days old) exhibits higher default exposure.`
          : `Established account history (${rawValue} days tenure).`;
        break;

      case 'deviceChanges':
        explanation = rawValue > 1
          ? `${rawValue} device changes detected within a short timeframe.`
          : 'Stable device profile observed.';
        break;

      case 'unusualAmountRatio':
        explanation = rawValue > 2.5
          ? `Transaction amount is ${rawValue}x higher than the customer historical average.`
          : 'Transaction amount aligns with typical user profile.';
        break;

      case 'chargebackHistory':
        explanation = rawValue > 0
          ? `${rawValue} previous chargeback incident(s) recorded on account.`
          : 'Zero historical chargebacks recorded.';
        break;

      case 'sharedDeviceCount':
        explanation = rawValue > 1
          ? `${rawValue} distinct accounts share the same physical device fingerprint.`
          : 'Dedicated device fingerprint unique to this user.';
        break;

      case 'sharedIpCount':
        explanation = rawValue > 2
          ? `${rawValue} accounts are operating from the same subnet IP.`
          : 'Clean single-user IP address usage.';
        break;

      default:
        explanation = isRiskIncreasing
          ? `Elevated parameter value (${rawValue}) contributes +${impact.toFixed(2)} to overall risk score.`
          : `Favorable parameter value (${rawValue}) reduces overall risk.`;
    }

    return {
      feature: featureName,
      value: rawValue,
      contribution: parseFloat(Math.abs(impact).toFixed(4)),
      direction,
      humanReadableExplanation: explanation,
    };
  }

  /**
   * Evaluates complete explainable risk decision for a transaction or entity event.
   */
  static async evaluateDecision(transactionInput = {}, options = {}) {
    const rawAmount = Number(transactionInput.transactionAmount ?? transactionInput.amount);
    const amount = !isNaN(rawAmount) && rawAmount > 0 ? parseFloat(rawAmount.toFixed(2)) : 0.0;

    // 1. Feature Engineering & Validation
    const cleanedInputs = FeaturePipeline.validateAndCleanInputs({
      ...transactionInput,
      transactionAmount: amount,
    });

    // 2. ML Risk Model Inference with Circuit Breaker
    const mlExecution = await defaultMlCircuitBreaker.execute(
      () => Promise.resolve(defaultRiskEngine.predictRisk(cleanedInputs, options.modelChoice || 'gbdt')),
      (err) => {
        const heuristicProb = cleanedInputs.transactionVelocity > 10 || cleanedInputs.failedAttempts > 3 ? 0.75 : 0.20;
        return {
          isFallback: true,
          fallbackReason: err.message,
          modelVersion: 'fallback-heuristic-v1',
          riskProbability: heuristicProb,
          riskScore: heuristicProb * 100,
          topRiskFactors: [],
        };
      }
    );

    const mlResult = mlExecution;

    // 3. Graph Risk & Relational Signals
    const customerId = transactionInput.customerId || transactionInput.userId || 'cust_current';
    const deviceId = transactionInput.deviceId || cleanedInputs.deviceId;
    const ipAddress = transactionInput.ipAddress || cleanedInputs.ipAddress;

    let graphAnalysis = {
      graphRiskScore: 10,
      graphRiskLevel: 'LOW',
      features: { sharedDeviceCount: 0, sharedIpCount: 0, clusterSize: 1, isCyclicCollusion: false, cycleCount: 0 },
      explanations: ['Relational graph exhibits isolated topology with zero shared infrastructure.'],
      topGraphSignals: [],
    };

    try {
      const subgraph = await defaultGraphStore.fetchNeighborhood(customerId, 2);
      if (subgraph.nodes.length > 1) {
        graphAnalysis = GraphEngineService.analyzeEntityGraph(customerId, subgraph);
      }
    } catch (gErr) {
      console.warn('[DecisionPipeline] Graph neighborhood lookup skipped:', gErr.message);
    }

    // 4. Combined Risk Formulation (Bayesian Evidentiary Combination)
    const baseLogit = Math.log(Math.max(1e-6, mlResult.riskProbability) / Math.max(1e-6, 1 - mlResult.riskProbability));
    const graphPenalty = ((graphAnalysis.graphRiskScore - 20) / 100) * 1.5;
    const combinedLogit = baseLogit + graphPenalty;
    const combinedProbability = parseFloat((1 / (1 + Math.exp(-combinedLogit))).toFixed(4));
    const combinedRiskScore = parseFloat((combinedProbability * 100).toFixed(1));

    // 5. Expected Loss Calculation
    const expectedLoss = parseFloat((combinedProbability * amount).toFixed(2));

    // 6. Explainability (Feature Attributions with Direction & Explanations)
    const rawContributions = defaultRiskEngine.gbdtModel
      ? defaultRiskEngine.gbdtModel.getFeatureContributions(
          FeaturePipeline.transform(cleanedInputs, defaultRiskEngine.scalerStats).featureVector,
          cleanedInputs
        )
      : [];

    const topRiskFactors = rawContributions.slice(0, 5).map((fc) => {
      const isPositiveImpact = (fc.impact || 0) > 0.05;
      return this.formatFeatureExplanation(
        fc.feature,
        cleanedInputs[fc.feature],
        isPositiveImpact ? (fc.impact || 0.5) : -(fc.importance || 0.1)
      );
    });

    // 7. Deterministic Policy Engine Evaluation (Strict ALLOW / REVIEW / BLOCK)
    const policyContext = {
      ...cleanedInputs,
      amount,
      fraudProbability: combinedProbability,
      riskScore: combinedRiskScore,
      expectedLoss,
      sharedDeviceCount: Math.max(cleanedInputs.sharedDeviceCount || 0, graphAnalysis.features.sharedDeviceCount || 0),
      sharedIpCount: Math.max(cleanedInputs.sharedIpCount || 0, graphAnalysis.features.sharedIpCount || 0),
      ringCycleCount: graphAnalysis.features.cycleCount || 0,
      isFallback: mlExecution.isFallback || false,
      piiLeaks: transactionInput.piiLeaks || 0,
      phishingLikelihood: transactionInput.phishingLikelihood || 0.0,
    };

    const policyOutcome = PolicyEngineService.evaluatePolicies(policyContext, options.customPolicies);

    // 8. Confidence Score Calculation
    const confidence = parseFloat((mlExecution.isFallback ? 0.65 : 0.95).toFixed(2));

    return {
      evaluatedAt: new Date().toISOString(),
      decision: policyOutcome.decision, // 'ALLOW' | 'REVIEW' | 'BLOCK'
      decisionReason: policyOutcome.decisionReason,
      riskScore: combinedRiskScore,
      fraudProbability: combinedProbability,
      expectedLoss,
      confidence,
      policyVersion: policyOutcome.policyVersion,
      modelVersion: mlResult.modelVersion,
      isFallback: mlExecution.isFallback || false,
      topRiskFactors,
      graphEvidence: {
        graphRiskScore: graphAnalysis.graphRiskScore,
        graphRiskLevel: graphAnalysis.graphRiskLevel,
        clusterSize: graphAnalysis.features.clusterSize,
        sharedDeviceCount: graphAnalysis.features.sharedDeviceCount,
        sharedIpCount: graphAnalysis.features.sharedIpCount,
        isCyclicCollusion: graphAnalysis.features.isCyclicCollusion,
        explanations: graphAnalysis.explanations,
        topGraphSignals: graphAnalysis.topGraphSignals,
      },
      policyEvaluation: {
        triggeredPolicy: policyOutcome.triggeredPolicy,
        matchedRulesCount: policyOutcome.matchedRulesCount,
        matchedRules: policyOutcome.matchedRules,
      },
      transactionTelemetry: {
        amount,
        velocity: cleanedInputs.transactionVelocity,
        failedAttempts: cleanedInputs.failedAttempts,
        accountAge: cleanedInputs.accountAge,
      },
    };

    // Async record audit trail & prediction telemetry
    try {
      const eventId = transactionInput.eventId || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await defaultRiskAudit.recordAudit({
        eventId,
        ...decisionPayload,
      });

      await defaultModelMonitor.logPrediction({
        predictionId: eventId,
        modelVersion: decisionPayload.modelVersion,
        featureVersion: decisionPayload.policyVersion,
        riskProbability: decisionPayload.fraudProbability,
        riskScore: decisionPayload.riskScore,
        decision: decisionPayload.decision,
        expectedLoss: decisionPayload.expectedLoss,
        inferenceLatencyMs: 3.5,
        sanitizedFeatures: {
          transactionAmount: amount,
          transactionVelocity: cleanedInputs.transactionVelocity,
          failedAttempts: cleanedInputs.failedAttempts,
          accountAge: cleanedInputs.accountAge,
          ipRisk: cleanedInputs.ipRisk,
          sharedDeviceCount: cleanedInputs.sharedDeviceCount,
        },
      });
    } catch (auditErr) {
      console.warn('[DecisionPipeline] Audit/Monitor record write skipped:', auditErr.message);
    }

    return decisionPayload;
  }
}

module.exports = DecisionPipelineService;
