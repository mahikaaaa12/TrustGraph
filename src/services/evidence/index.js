const EvidenceTypes = require('./EvidenceTypes');
const EvidenceBuilder = require('./EvidenceBuilder');
const EvidenceAggregator = require('./EvidenceAggregator');

module.exports = {
  EvidenceTypes,
  EvidenceBuilder,
  EvidenceAggregator,
  CATEGORIES: EvidenceTypes.CATEGORIES,
  ASSESSMENTS: EvidenceTypes.ASSESSMENTS,
  SOURCES: EvidenceTypes.SOURCES,
  normalizeAssessment: EvidenceTypes.normalizeAssessment,
};
