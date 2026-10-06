const { ASSESSMENTS } = require('./EvidenceTypes');

/**
 * Aggregates granular evidence records into category summaries and overall assessment metrics
 */
class EvidenceAggregator {
  static aggregate(evidences = []) {
    if (!Array.isArray(evidences)) {
      return { totalCount: 0, byCategory: {}, summaryAssessment: ASSESSMENTS.INCONCLUSIVE, evidenceList: [] };
    }

    const byCategory = {};
    let totalScoreSum = 0;
    let totalConfidenceSum = 0;
    let validCount = 0;

    evidences.forEach((item) => {
      if (!item || !item.category) return;
      if (!byCategory[item.category]) {
        byCategory[item.category] = [];
      }
      byCategory[item.category].push(item);

      totalScoreSum += item.value || 0;
      totalConfidenceSum += item.confidence || 0;
      validCount++;
    });

    const averageScore = validCount > 0 ? parseFloat((totalScoreSum / validCount).toFixed(4)) : 0;
    const averageConfidence = validCount > 0 ? parseFloat((totalConfidenceSum / validCount).toFixed(4)) : 0;

    const hasHighRisk = evidences.some(
      (e) => e.assessment === ASSESSMENTS.HIGH_RISK || e.assessment === 'CRITICAL'
    );
    const hasSuspicious = evidences.some(
      (e) =>
        e.assessment === ASSESSMENTS.SUSPICIOUS ||
        e.assessment === ASSESSMENTS.LIKELY ||
        e.assessment === ASSESSMENTS.LIKELY_AI_GENERATED
    );

    let summaryAssessment = ASSESSMENTS.PASS;
    if (hasHighRisk) summaryAssessment = ASSESSMENTS.HIGH_RISK;
    else if (hasSuspicious) summaryAssessment = ASSESSMENTS.SUSPICIOUS;
    else if (validCount === 0) summaryAssessment = ASSESSMENTS.INCONCLUSIVE;

    return {
      totalCount: validCount,
      averageScore,
      averageConfidence,
      summaryAssessment,
      byCategory,
      evidenceList: evidences,
    };
  }
}

module.exports = EvidenceAggregator;
