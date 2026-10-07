const Analysis = require('../models/Analysis');
const History = require('../models/History');
const AppError = require('../utils/appError');
const { HTTP_STATUS } = require('../constants');
const { defaultFraudModel } = require('../ml/fraudModel');
const GraphAnalysisService = require('./graphAnalysis.service');
const ExplainabilityService = require('./explainability.service');
const LossCalculatorService = require('./lossCalculator.service');
const PolicyEngineService = require('./policyEngine.service');
const { defaultMlCircuitBreaker } = require('../utils/circuitBreaker');
const { defaultModelMonitor } = require('./modelMonitor.service');
const { metricsCollector } = require('../middlewares/metrics.middleware');

/**
 * Production-Ready Multi-Modal Trust Score Engine Service
 * Synthesizes Image, Document, Website, and Text telemetry scores into a unified Trust Index
 * backed by calibrated Machine Learning inference, Graph Abuse-Ring detection, and Explainable Attributions.
 */
class TrustScoreService {
  static WEIGHTS = Object.freeze({
    authenticity: 0.35,
    security: 0.25,
    metadata: 0.20,
    reputation: 0.20,
  });

  static normalizeScore(val) {
    if (val === undefined || val === null || isNaN(val)) return null;
    return Math.max(0.0, Math.min(100.0, parseFloat(val)));
  }

  static calculateConfidence(scores) {
    const validScores = Object.values(scores).filter((v) => v !== null && v !== undefined);
    if (validScores.length === 0) return 0.0;

    const availabilityRatio = validScores.length / 4;
    const mean = validScores.reduce((a, b) => a + b, 0) / validScores.length;
    const variance = validScores.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / validScores.length;
    const stdDev = Math.sqrt(variance);

    const variancePenalty = Math.min(0.25, (stdDev / 100) * 0.3);
    let confidence = 0.65 + availabilityRatio * 0.3 - variancePenalty;
    return parseFloat(Math.max(0.1, Math.min(0.99, confidence)).toFixed(2));
  }

  /**
   * Master Multi-Modal Trust Score Synthesizer with ML & Graph Defense
   */
  static async evaluateTrustScore(inputs, userId) {
    const {
      imageScore,
      documentScore,
      websiteScore,
      textScore,
      amount = 0,
      velocity = 1,
      graphTopology = null,
      customPolicies = null,
    } = inputs;

    const normImage = this.normalizeScore(imageScore);
    const normDoc = this.normalizeScore(documentScore);
    const normWeb = this.normalizeScore(websiteScore);
    const normText = this.normalizeScore(textScore);

    const inputScores = {
      image: normImage,
      document: normDoc,
      website: normWeb,
      text: normText,
    };

    const analyzedModalities = [];
    const missingModalities = [];

    if (normImage !== null) analyzedModalities.push('IMAGE'); else missingModalities.push('IMAGE');
    if (normDoc !== null) analyzedModalities.push('DOCUMENT'); else missingModalities.push('DOCUMENT');
    if (normWeb !== null) analyzedModalities.push('WEBSITE'); else missingModalities.push('WEBSITE');
    if (normText !== null) analyzedModalities.push('TEXT'); else missingModalities.push('TEXT');

    if (analyzedModalities.length === 0) {
      throw new AppError('Please provide at least one valid modality score (imageScore, documentScore, websiteScore, textScore).', HTTP_STATUS.BAD_REQUEST);
    }

    // Active dimension values computed purely from provided modalities (ZERO ghost defaults)
    const rawDimensionVals = {
      authenticity: normImage !== null && normText !== null
        ? normImage * 0.5 + normText * 0.5
        : (normImage ?? normText ?? null),
      security: normWeb !== null && normDoc !== null
        ? normWeb * 0.6 + normDoc * 0.4
        : (normWeb ?? normDoc ?? null),
      metadata: normImage !== null && normDoc !== null
        ? normImage * 0.4 + normDoc * 0.6
        : (normDoc ?? normImage ?? null),
      reputation: normWeb !== null && normText !== null
        ? normWeb * 0.7 + normText * 0.3
        : (normWeb ?? normText ?? null),
    };

    const activeDimensions = {
      authenticity: rawDimensionVals.authenticity !== null,
      security: rawDimensionVals.security !== null,
      metadata: rawDimensionVals.metadata !== null,
      reputation: rawDimensionVals.reputation !== null,
    };

    let totalActiveWeight = 0;
    for (const [dim, active] of Object.entries(activeDimensions)) {
      if (active) totalActiveWeight += this.WEIGHTS[dim];
    }

    // Dynamically renormalize weights over active dimensions
    let weightedSum = 0;
    const dimensions = {};
    for (const [dim, baseWeight] of Object.entries(this.WEIGHTS)) {
      const isActive = activeDimensions[dim];
      const val = rawDimensionVals[dim];
      const normalizedWeight = isActive && totalActiveWeight > 0 ? baseWeight / totalActiveWeight : 0;
      const contribution = isActive && val !== null ? parseFloat((val * normalizedWeight).toFixed(1)) : 0;
      if (isActive && val !== null) {
        weightedSum += val * normalizedWeight;
      }
      dimensions[dim] = {
        active: isActive,
        score: val !== null ? parseFloat(val.toFixed(1)) : null,
        baseWeight,
        normalizedWeight: parseFloat(normalizedWeight.toFixed(4)),
        contribution,
      };
    }

    const heuristicTrustScore = parseFloat(weightedSum.toFixed(1));

    const breakdown = {
      authenticityIndex: dimensions.authenticity.score,
      securityEncryption: dimensions.security.score,
      metadataProvenance: dimensions.metadata.score,
      sourceReputation: dimensions.reputation.score,
    };

    const confidenceScore = this.calculateConfidence(inputScores);

    // 1. Execute ML Fraud & Risk Model Prediction with Circuit Breaker
    const mlRawInputs = {
      authenticityScore: dimensions.authenticity.score ?? heuristicTrustScore,
      securityScore: dimensions.security.score ?? heuristicTrustScore,
      metadataScore: dimensions.metadata.score ?? heuristicTrustScore,
      reputationScore: dimensions.reputation.score ?? heuristicTrustScore,
      amount: Number(amount) || 0,
      velocity: Number(velocity) || 1,
      piiLeaks: normDoc !== null && normDoc < 60 ? 2 : 0,
      phishingLikelihood: normWeb !== null && normWeb < 60 ? (100 - normWeb) / 100 : 0,
      imageTampered: normImage !== null && normImage < 50,
      aiLikelihood: inputs.aiLikelihood !== undefined && inputs.aiLikelihood !== null
        ? Number(inputs.aiLikelihood)
        : Math.max(
            normText !== null && normText < 65 ? (100 - normText) / 100 : 0,
            normImage !== null && normImage < 50 ? (100 - normImage) / 100 : 0
          ),
      suspiciousDomain: normWeb !== null && normWeb < 55,
      socialEngLikelihood: normText !== null && normText < 50 ? (100 - normText) / 100 : 0,
    };

    const mlExecution = await defaultMlCircuitBreaker.execute(
      () => defaultFraudModel.predict(mlRawInputs),
      () => ({
        modelVersion: 'fallback-heuristic-v1',
        fraudProbability: parseFloat(((100 - heuristicTrustScore) / 100).toFixed(4)),
        trustScore: heuristicTrustScore,
        riskTier: heuristicTrustScore < 40 ? 'CRITICAL' : heuristicTrustScore < 65 ? 'HIGH' : heuristicTrustScore < 85 ? 'MEDIUM' : 'LOW',
        featureContributions: [],
      })
    );

    const mlPrediction = mlExecution;
    defaultModelMonitor.recordEvent(mlPrediction, mlRawInputs);

    // 2. Execute Graph-Based Abuse-Ring Analysis
    const graphAnalysis = GraphAnalysisService.analyzeAbuseRings(
      graphTopology || {
        nodes: [
          { id: 'user_node', label: 'Evaluated Target', type: 'user', risk: mlPrediction.riskTier },
          { id: 'sec_node', label: 'Security Domain', type: 'security', risk: dimensions.security.score < 60 ? 'high' : 'low' },
          { id: 'meta_node', label: 'Metadata Provenance', type: 'metadata', risk: dimensions.metadata.score < 60 ? 'high' : 'low' },
        ],
        edges: [
          { source: 'user_node', target: 'sec_node', type: 'EVALUATES', weight: 1 },
          { source: 'user_node', target: 'meta_node', type: 'PARSES', weight: 1 },
        ],
      }
    );

    // 3. Execute Explainability Engine
    const explainability = ExplainabilityService.generateExplanation(mlPrediction, mlRawInputs);

    // 4. Execute Cost-Sensitive Loss Calculation
    const expectedLoss = LossCalculatorService.calculateExpectedLoss(
      mlPrediction.fraudProbability,
      Number(amount) || 0
    );

    // 5. Execute Deterministic Policy Engine
    const policyEvaluation = PolicyEngineService.evaluatePolicies(
      {
        ...mlRawInputs,
        trustScore: mlPrediction.trustScore,
        fraudProbability: mlPrediction.fraudProbability,
        ringCycleCount: graphAnalysis.cycleCount || 0,
        ringRiskScore: graphAnalysis.ringRiskScore || 0,
      },
      customPolicies
    );

    // Composite Final Trust Score & Risk Category
    const isTransactionContext = (amount && Number(amount) > 0) || (velocity && Number(velocity) > 1);
    const overallTrustScore = isTransactionContext && mlPrediction.trustScore !== undefined
      ? mlPrediction.trustScore
      : heuristicTrustScore;
    let riskCategory = overallTrustScore < 40 ? 'critical' : overallTrustScore < 60 ? 'high' : overallTrustScore < 80 ? 'medium' : 'low';

    metricsCollector.recordModelEvaluation(riskCategory.toUpperCase(), expectedLoss.expectedLossUSD);

    const positiveFactors = [];
    const negativeFactors = [];
    const evidence = [];

    if (dimensions.authenticity.active && dimensions.authenticity.score !== null) {
      if (dimensions.authenticity.score >= 80) positiveFactors.push('High authenticity score across image and text forensics.');
      else negativeFactors.push('Authenticity index flagged potential synthetic alteration or AI generation.');
    }

    if (dimensions.security.active && dimensions.security.score !== null) {
      if (dimensions.security.score >= 80) positiveFactors.push('Strong security and TLS encryption parameters.');
      else negativeFactors.push('Security index flagged potential unencrypted socket or sensitive PII exposures.');
    }

    if (dimensions.metadata.active && dimensions.metadata.score !== null) {
      if (dimensions.metadata.score >= 75) positiveFactors.push('Rich metadata provenance and header tags verified.');
      else negativeFactors.push('Metadata provenance lacks complete camera hardware or producer details.');
    }

    if (dimensions.reputation.active && dimensions.reputation.score !== null) {
      if (dimensions.reputation.score >= 80) positiveFactors.push('Domain and text reputation benchmarks clean.');
      else negativeFactors.push('Source reputation indicates potential domain blacklist or clickbait patterns.');
    }

    evidence.push(`Evaluated ${analyzedModalities.length} active modality/modalities (${analyzedModalities.join(', ')}).`);
    if (missingModalities.length > 0) {
      evidence.push(`Unanalyzed modalities: ${missingModalities.join(', ')} (weights dynamically renormalized; zero ghost scores assigned).`);
    }
    evidence.push(`Variance-adjusted statistical confidence: ${(confidenceScore * 100).toFixed(0)}%.`);
    evidence.push(`Calibrated ML Model Version: ${mlPrediction.modelVersion}.`);

    const insights = [
      `Overall Composite Trust Index: ${overallTrustScore} / 100 (${riskCategory.toUpperCase()} risk profile).`,
      `ML Fraud Probability: ${(mlPrediction.fraudProbability * 100).toFixed(1)}% [Decision Tier: ${mlPrediction.riskTier}].`,
      `Policy Engine Action: ${policyEvaluation.decision}${policyEvaluation.triggeredPolicy ? ` (Triggered by ${policyEvaluation.triggeredPolicy.name})` : ''}.`,
      graphAnalysis.detected
        ? `ABUSE RING ALERT: Graph topology detected ${graphAnalysis.cycleCount} collusion cycles.`
        : 'GRAPH CLEAN: No circular collusion cycles detected in entity topology.',
    ];

    const { getDbState } = require('../config/db');
    let analysisRecord = null;

    if (getDbState() === 1) {
      analysisRecord = await Analysis.create({
        userId,
        targetEntity: 'Multi-Modal Trust Evaluation',
        entityType: 'content',
        trustScore: overallTrustScore,
        confidenceScore,
        status: 'completed',
        riskCategory,
        insights,
        graphMetadata: {
          nodeCount: graphAnalysis.nodeCount || providedScores.length,
          edgeCount: graphAnalysis.edgeCount || Object.keys(breakdown).length,
          centralityScore: overallTrustScore / 100,
        },
        mlPrediction: {
          fraudProbability: mlPrediction.fraudProbability,
          riskTier: mlPrediction.riskTier,
          modelVersion: mlPrediction.modelVersion,
          rawLogit: mlPrediction.rawLogit,
          isFallback: mlExecution.isFallback,
        },
        expectedLoss,
        policyEvaluation,
        abuseRingAnalysis: {
          detected: graphAnalysis.detected,
          ringRiskScore: graphAnalysis.ringRiskScore,
          cycleCount: graphAnalysis.cycleCount,
        },
        explainability: {
          summary: explainability.summary,
          topRiskDrivers: explainability.topRiskDrivers,
          protectiveFactors: explainability.protectiveFactors,
          counterfactuals: explainability.counterfactuals,
        },
        modelVersion: mlPrediction.modelVersion,
      }).catch(() => null);

      if (analysisRecord) {
        await History.create({
          userId,
          action: 'ANALYSIS_RUN',
          entityId: analysisRecord._id,
          entityType: 'Analysis',
          details: {
            overallTrustScore,
            confidenceScore,
            riskCategory,
            fraudProbability: mlPrediction.fraudProbability,
            modelVersion: mlPrediction.modelVersion,
          },
        }).catch(() => null);

        try {
          const NotificationService = require('./notification.service');
          await NotificationService.createNotification({
            userId,
            type: riskCategory === 'critical' ? 'CRITICAL_THREAT' : 'ANALYSIS_COMPLETE',
            title: `Multi-Modal Trust Score Evaluation`,
            message: `Composite Trust Score computed: ${overallTrustScore}% (${riskCategory.toUpperCase()} risk profile). ML Fraud Probability: ${(mlPrediction.fraudProbability * 100).toFixed(1)}%.`,
            severity: riskCategory === 'critical' ? 'critical' : riskCategory === 'high' ? 'warning' : 'success',
            entityId: analysisRecord._id,
          });
        } catch (nErr) {
          console.error('[TrustScoreService] Notification trigger error:', nErr.message);
        }
      }
    }

    return {
      analysisId: analysisRecord ? analysisRecord._id : null,
      analyzedModalities,
      missingModalities,
      overallTrustScore,
      confidenceScore,
      riskCategory,
      dimensions,
      positiveFactors,
      negativeFactors,
      evidence,
      dataAvailability: {
        providedChannels: analyzedModalities.length,
        totalChannels: 4,
        availabilityRatio: analyzedModalities.length / 4,
      },
      weights: this.WEIGHTS,
      breakdown,
      inputScores,
      insights,
      mlModelOutput: {
        modelVersion: mlPrediction.modelVersion,
        fraudProbability: mlPrediction.fraudProbability,
        riskTier: mlPrediction.riskTier,
        isFallback: mlExecution.isFallback,
        featureContributions: mlPrediction.featureContributions || [],
      },
      graphAbuseRingOutput: graphAnalysis,
      explainabilityOutput: explainability,
      expectedLossOutput: expectedLoss,
      policyEngineOutput: policyEvaluation,
    };
  }
}

module.exports = TrustScoreService;

