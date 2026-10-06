/**
 * Standardized Evidence Types, Categories, Assessments, and Sources for TrustGraph
 */

const CATEGORIES = Object.freeze({
  IMAGE_AI_GENERATION: 'IMAGE_AI_GENERATION',
  IMAGE_MANIPULATION: 'IMAGE_MANIPULATION',
  IMAGE_PROVENANCE: 'IMAGE_PROVENANCE',
  IMAGE_METADATA: 'IMAGE_METADATA',
  IMAGE_SECURITY: 'IMAGE_SECURITY',
  TEXT_AI_GENERATION: 'TEXT_AI_GENERATION',
  TEXT_SOCIAL_ENGINEERING: 'TEXT_SOCIAL_ENGINEERING',
  TEXT_SENTIMENT: 'TEXT_SENTIMENT',
  DOCUMENT_PII: 'DOCUMENT_PII',
  DOCUMENT_SECURITY: 'DOCUMENT_SECURITY',
  WEBSITE_PHISHING: 'WEBSITE_PHISHING',
  WEBSITE_SECURITY: 'WEBSITE_SECURITY',
  BRAND_COLLABORATION: 'BRAND_COLLABORATION',
  TRANSACTION_FRAUD: 'TRANSACTION_FRAUD',
  GRAPH_COLLUSION: 'GRAPH_COLLUSION',
});

const ASSESSMENTS = Object.freeze({
  SAFE: 'SAFE',
  PASS: 'PASS',
  LOW_RISK: 'LOW_RISK',
  REVIEW: 'REVIEW',
  SUSPICIOUS: 'SUSPICIOUS',
  LIKELY: 'LIKELY',
  HIGH_RISK: 'HIGH_RISK',
  INCONCLUSIVE: 'INCONCLUSIVE',
  LIKELY_AI_GENERATED: 'LIKELY_AI_GENERATED',
});

const SOURCES = Object.freeze({
  HEURISTIC: 'HEURISTIC',
  MODEL: 'MODEL',
  METADATA: 'METADATA',
  C2PA: 'C2PA',
  FORENSICS: 'FORENSICS',
  RULE_ENGINE: 'RULE_ENGINE',
  DNS: 'DNS',
  TLS: 'TLS',
  URL: 'URL',
  CONTENT: 'CONTENT',
  EMAIL: 'EMAIL',
});

/**
 * Helper to normalize descriptive assessment strings into standard enum values.
 */
function normalizeAssessment(rawAssessment) {
  if (!rawAssessment) return ASSESSMENTS.INCONCLUSIVE;
  const upper = String(rawAssessment).toUpperCase().trim();

  if (Object.values(ASSESSMENTS).includes(upper)) {
    return upper;
  }

  // Common mapping fallbacks
  if (upper === 'VERY_HIGH' || upper === 'CRITICAL' || upper === 'HIGH' || upper === 'HIGH_RISK') return ASSESSMENTS.HIGH_RISK;
  if (upper === 'POSSIBLE' || upper === 'SUSPICIOUS') return ASSESSMENTS.SUSPICIOUS;
  if (upper === 'MEDIUM' || upper === 'REVIEW') return ASSESSMENTS.REVIEW;
  if (upper === 'UNLIKELY' || upper === 'LOW') return ASSESSMENTS.LOW_RISK;
  if (upper === 'CLEAN' || upper === 'SAFE') return ASSESSMENTS.SAFE;
  if (upper === 'VERIFIED' || upper === 'PASS') return ASSESSMENTS.PASS;

  return ASSESSMENTS.INCONCLUSIVE;
}

module.exports = {
  CATEGORIES,
  ASSESSMENTS,
  SOURCES,
  normalizeAssessment,
};
