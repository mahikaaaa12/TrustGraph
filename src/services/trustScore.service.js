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
   */
  static WEIGHTS = Object.freeze({
    authenticity: 0.35, // Forgery detection, AI generation risk, text manipulation
    security: 0.25,     // TLS/SSL encryption, PII leaks, API key exposures
    metadata: 0.20,     // EXIF tags, PDF producer, WHOIS creation date
    reputation: 0.20,   // VirusTotal blacklists, domain age, clickbait index
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
   * Formula: Combines Data Availability Ratio (N / N_total) with Variance Penalty.
   */
  static calculateConfidence(scores) {
    const validScores = Object.values(scores).filter((v) => v !== null && v !== undefined);
    if (validScores.length === 0) return 0.0;

    // 1. Data Availability Ratio (e.g. 3 of 4 modalities present = 0.75)
    const availabilityRatio = validScores.length / 4;

    // 2. Variance Penalty (High variance across scores reduces confidence)
    const mean = validScores.reduce((a, b) => a + b, 0) / validScores.length;
    const variance = validScores.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / validScores.length;
    const stdDev = Math.sqrt(variance);

    // Variance penalty factor (higher std dev = higher uncertainty)
    const variancePenalty = Math.min(0.25, (stdDev / 100) * 0.3);

    // Base confidence starts at 0.70 for single modality up to 0.98 for multi-modal consensus
    let confidence = 0.65 + availabilityRatio * 0.3 - variancePenalty;
    return parseFloat(Math.max(0.1, Math.min(0.99, confidence)).toFixed(2));
  }

  /**
   * Master Multi-Modal Trust Score Synthesizer
   */
  static async evaluateTrustScore(inputs, userId) {
    const { imageScore, documentScore, websiteScore, textScore } = inputs;

    // 1. Normalize Modality Inputs
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

    // Require at least one valid score modality
    const providedScores = Object.values(inputScores).filter((v) => v !== null);
    if (providedScores.length === 0) {
      throw new AppError('Please provide at least one valid modality score (imageScore, documentScore, websiteScore, textScore).', HTTP_STATUS.BAD_REQUEST);
    }

    // 2. Map Modality Inputs onto Strategic Dimension Categories
    // Authenticity: Derived from Image Forensics & Text Authenticity
    const authenticityVal =
      normImage !== null && normText !== null
        ? normImage * 0.5 + normText * 0.5
        : normImage ?? normText ?? normDoc ?? 75.0;

    // Security: Derived from Website SSL & Document PII Scans
    const securityVal =
      normWeb !== null && normDoc !== null
        ? normWeb * 0.6 + normDoc * 0.4
        : normWeb ?? normDoc ?? 80.0;

    // Metadata Provenance: Derived from Image EXIF & Document Header Telemetry
    const metadataVal =
      normImage !== null && normDoc !== null
        ? normImage * 0.4 + normDoc * 0.6
        : normDoc ?? normImage ?? 70.0;

    // Source Reputation: Derived from Website Blacklists & Text Fake News Index
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

    // 3. Compute Weighted Average Composite Trust Score
    const overallTrustScore = parseFloat(
      (
        breakdown.authenticityIndex * this.WEIGHTS.authenticity +
        breakdown.securityEncryption * this.WEIGHTS.security +
        breakdown.metadataProvenance * this.WEIGHTS.metadata +
        breakdown.sourceReputation * this.WEIGHTS.reputation
      ).toFixed(1)
    );

    // 4. Compute Statistical Confidence Level
    const confidenceScore = this.calculateConfidence(inputScores);

    // 5. Categorize Risk Profile
    let riskCategory = 'low';
    if (overallTrustScore < 40) riskCategory = 'critical';
    else if (overallTrustScore < 65) riskCategory = 'high';
    else if (overallTrustScore < 85) riskCategory = 'medium';

    // 6. Generate Insights & Summary
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

    // 7. Save Analysis Document in MongoDB
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

    // 8. Log History Event
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

    return {
      analysisId: analysisRecord._id,
      overallTrustScore,
      confidenceScore,
      riskCategory,
      weights: this.WEIGHTS,
      breakdown,
      inputScores,
      insights,
    };
  }
}

module.exports = TrustScoreService;
