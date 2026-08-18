const Analysis = require('../models/Analysis');
const History = require('../models/History');
const AppError = require('../utils/appError');
const { HTTP_STATUS } = require('../constants');

/**
 * Production-Ready Multi-Modal Trust Score Engine Service
 * Synthesizes Image, Document, Website, and Text telemetry scores into a unified Trust Index.
 */
class TrustScoreService {
  /**
   * Weights assigned to each domain modality based on enterprise risk impact.
   * Documented Weights:
   * - Authenticity: 35% (Image ELA/EXIF & Text Perplexity/Burstiness)
   * - Security: 25% (Website TLS/SSL & Document PII Leaks)
   * - Metadata: 20% (EXIF hardware tags & PDF/Document Headers)
   * - Reputation: 20% (Domain Blacklists & Clickbait Sensationalism)
   */
  static WEIGHTS = Object.freeze({
    authenticity: 0.35,
    security: 0.25,
    metadata: 0.20,
    reputation: 0.20,
  });

  /**
   * Normalizes a raw input score to strictly abide by the 0.0 - 100.0 bound.
   */
  static normalizeScore(val) {
    if (val === undefined || val === null || isNaN(val)) return null;
    return Math.max(0.0, Math.min(100.0, parseFloat(val)));
  }

  /**
   * Calculates overall System Confidence Score (0.0 to 1.0)
   */
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
   * Master Multi-Modal Trust Score Synthesizer
   */
  static async evaluateTrustScore(inputs, userId) {
    const { imageScore, documentScore, websiteScore, textScore } = inputs;

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

    const providedScores = Object.values(inputScores).filter((v) => v !== null);
    if (providedScores.length === 0) {
      throw new AppError('Please provide at least one valid modality score (imageScore, documentScore, websiteScore, textScore).', HTTP_STATUS.BAD_REQUEST);
    }

    const authenticityVal =
      normImage !== null && normText !== null
        ? normImage * 0.5 + normText * 0.5
        : normImage ?? normText ?? normDoc ?? 75.0;

    const securityVal =
      normWeb !== null && normDoc !== null
        ? normWeb * 0.6 + normDoc * 0.4
        : normWeb ?? normDoc ?? 80.0;

    const metadataVal =
      normImage !== null && normDoc !== null
        ? normImage * 0.4 + normDoc * 0.6
        : normDoc ?? normImage ?? 70.0;

    const reputationVal =
      normWeb !== null && normText !== null
        ? normWeb * 0.7 + normText * 0.3
        : normWeb ?? normText ?? 75.0;

    const breakdown = {
      authenticityIndex: parseFloat(authenticityVal.toFixed(1)),
      securityEncryption: parseFloat(securityVal.toFixed(1)),
      metadataProvenance: parseFloat(metadataVal.toFixed(1)),
      sourceReputation: parseFloat(reputationVal.toFixed(1)),
    };

    const dimensions = {
      authenticity: {
        score: breakdown.authenticityIndex,
        weight: this.WEIGHTS.authenticity,
        contribution: parseFloat((breakdown.authenticityIndex * this.WEIGHTS.authenticity).toFixed(1)),
      },
      security: {
        score: breakdown.securityEncryption,
        weight: this.WEIGHTS.security,
        contribution: parseFloat((breakdown.securityEncryption * this.WEIGHTS.security).toFixed(1)),
      },
      metadata: {
        score: breakdown.metadataProvenance,
        weight: this.WEIGHTS.metadata,
        contribution: parseFloat((breakdown.metadataProvenance * this.WEIGHTS.metadata).toFixed(1)),
      },
      reputation: {
        score: breakdown.sourceReputation,
        weight: this.WEIGHTS.reputation,
        contribution: parseFloat((breakdown.sourceReputation * this.WEIGHTS.reputation).toFixed(1)),
      },
    };

    const overallTrustScore = parseFloat(
      (
        dimensions.authenticity.contribution +
        dimensions.security.contribution +
        dimensions.metadata.contribution +
        dimensions.reputation.contribution
      ).toFixed(1)
    );

    const confidenceScore = this.calculateConfidence(inputScores);

    let riskCategory = 'low';
    if (overallTrustScore < 40) riskCategory = 'critical';
    else if (overallTrustScore < 65) riskCategory = 'high';
    else if (overallTrustScore < 85) riskCategory = 'medium';

    const positiveFactors = [];
    const negativeFactors = [];
    const evidence = [];

    if (dimensions.authenticity.score >= 80) positiveFactors.push('High authenticity score across image and text forensics.');
    else negativeFactors.push('Authenticity index flagged potential synthetic alteration or AI generation.');

    if (dimensions.security.score >= 80) positiveFactors.push('Strong security and TLS encryption parameters.');
    else negativeFactors.push('Security index flagged potential unencrypted socket or sensitive PII exposures.');

    if (dimensions.metadata.score >= 75) positiveFactors.push('Rich metadata provenance and header tags verified.');
    else negativeFactors.push('Metadata provenance lacks complete camera hardware or producer details.');

    if (dimensions.reputation.score >= 80) positiveFactors.push('Domain and text reputation benchmarks clean.');
    else negativeFactors.push('Source reputation indicates potential domain blacklist or clickbait patterns.');

    evidence.push(`Evaluated ${providedScores.length} of 4 input modalities.`);
    evidence.push(`Variance-adjusted statistical confidence: ${(confidenceScore * 100).toFixed(0)}%.`);

    const insights = [
      `Overall Multi-Modal Trust Index: ${overallTrustScore} / 100.`,
      `Evaluated across ${providedScores.length} active input modality channel(s).`,
      breakdown.authenticityIndex < 60
        ? 'AUTHENTICITY WARNING: High probability of synthetic alteration or AI generation.'
        : 'AUTHENTICITY VERIFIED: Content exhibits organic human creation characteristics.',
      breakdown.securityEncryption < 60
        ? 'SECURITY ALERT: Potential encryption flaw or sensitive PII data exposure detected.'
        : 'SECURITY CLEAN: Infrastructure and encryption parameters meet safety benchmarks.',
    ];

    const analysisRecord = await Analysis.create({
      userId,
      targetEntity: 'Multi-Modal Trust Evaluation',
      entityType: 'content',
      trustScore: overallTrustScore,
      confidenceScore,
      status: 'completed',
      riskCategory,
      insights,
      graphMetadata: {
        nodeCount: providedScores.length,
        edgeCount: Object.keys(breakdown).length,
        centralityScore: overallTrustScore / 100,
      },
    });

    await History.create({
      userId,
      action: 'ANALYSIS_RUN',
      entityId: analysisRecord._id,
      entityType: 'Analysis',
      details: {
        overallTrustScore,
        confidenceScore,
        riskCategory,
      },
    });

    try {
      const NotificationService = require('./notification.service');
      await NotificationService.createNotification({
        userId,
        type: 'ANALYSIS_COMPLETE',
        title: `Multi-Modal Trust Score Evaluation`,
        message: `Composite Trust Score computed: ${overallTrustScore}% (${riskCategory.toUpperCase()} risk profile). Confidence: ${(confidenceScore * 100).toFixed(0)}%.`,
        severity: riskCategory === 'critical' ? 'critical' : riskCategory === 'high' ? 'warning' : 'success',
        entityId: analysisRecord._id,
      });
    } catch (nErr) {
      console.error('[TrustScoreService] Notification trigger error:', nErr.message);
    }

    return {
      analysisId: analysisRecord._id,
      overallTrustScore,
      confidenceScore,
      riskCategory,
      dimensions,
      positiveFactors,
      negativeFactors,
      evidence,
      dataAvailability: {
        providedChannels: providedScores.length,
        totalChannels: 4,
        availabilityRatio: providedScores.length / 4,
      },
      weights: this.WEIGHTS,
      breakdown,
      inputScores,
      insights,
    };
  }
}

module.exports = TrustScoreService;
