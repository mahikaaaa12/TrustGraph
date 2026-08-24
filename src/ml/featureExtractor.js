/**
 * Feature Extractor for TrustGraph ML Inference Engine
 * Converts raw multi-modal telemetry and transaction inputs into standardized numerical vectors.
 */
class FeatureExtractor {
  /**
   * Transforms raw inputs into feature representation dictionary.
   * @param {Object} rawInputs - Raw signals across modalities
   * @returns {Object} Extracted normalized features in [0, 1] range
   */
  static extractFeatures(rawInputs = {}) {
    const {
      authenticityScore = 75,
      securityScore = 80,
      metadataScore = 70,
      reputationScore = 75,
      piiLeaks = 0,
      phishingLikelihood = 0,
      imageTampered = false,
      aiLikelihood = 0,
      suspiciousDomain = false,
      socialEngLikelihood = 0,
      amount = 0,
      velocity = 0,
    } = rawInputs;

    // Convert positive trust scores (0-100) into risk deficit features [0, 1]
    const authenticityDeficit = Math.max(0, Math.min(1, (100 - (Number(authenticityScore) || 0)) / 100));
    const securityVulnerability = Math.max(0, Math.min(1, (100 - (Number(securityScore) || 0)) / 100));
    const metadataTamperScore = Math.max(0, Math.min(1, (100 - (Number(metadataScore) || 0)) / 100));
    const reputationRisk = Math.max(0, Math.min(1, (100 - (Number(reputationScore) || 0)) / 100));

    // PII Leaks (log scaled, saturated at 10 leaks)
    const piiCount = Math.max(0, Number(piiLeaks) || 0);
    const piiLeakSeverity = Math.min(1.0, Math.log1p(piiCount) / Math.log1p(10));

    // Phishing Likelihood
    const phishingProbability = Math.max(0, Math.min(1, Number(phishingLikelihood) || 0));

    // Image Tampering
    const imageTamperEvidence = imageTampered ? 1.0 : 0.0;

    // AI Synthetic Content
    const aiSyntheticIndicator = Math.max(0, Math.min(1, Number(aiLikelihood) || 0));

    // Domain Suspicion
    const domainSuspicion = suspiciousDomain ? 1.0 : 0.0;

    // Social Engineering
    const socialEngThreat = Math.max(0, Math.min(1, Number(socialEngLikelihood) || 0));

    // Financial / Velocity features (if present)
    const numAmount = Math.max(0, Number(amount) || 0);
    const amountAnomaly = numAmount > 0 ? Math.min(1.0, Math.log10(numAmount + 1) / 5) : 0; // scaled up to $100k

    const numVelocity = Math.max(0, Number(velocity) || 0);
    const velocitySurge = Math.min(1.0, numVelocity / 20); // scaled up to 20 actions/hr

    return {
      authenticityDeficit,
      securityVulnerability,
      metadataTamperScore,
      reputationRisk,
      piiLeakSeverity,
      phishingProbability,
      imageTamperEvidence,
      aiSyntheticIndicator,
      domainSuspicion,
      socialEngThreat,
      amountAnomaly,
      velocitySurge,
    };
  }

  /**
   * Applies Z-score standardization using model baseline mean/std.
   */
  static standardize(features, scaling) {
    const standardized = {};
    for (const [key, value] of Object.entries(features)) {
      const mean = scaling.mean[key] || 0;
      const std = scaling.std[key] || 1;
      standardized[key] = (value - mean) / (std || 1);
    }
    return standardized;
  }
}

module.exports = FeatureExtractor;
