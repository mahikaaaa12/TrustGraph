const {
  EvidenceBuilder,
  EvidenceTypes,
  EvidenceAggregator,
  CATEGORIES,
  ASSESSMENTS,
  SOURCES,
} = require('../../src/services/evidence');

describe('Standardized Evidence Architecture Unit Tests', () => {
  describe('EvidenceTypes & Normalization', () => {
    it('should define expected categories, assessments, and sources', () => {
      expect(CATEGORIES.IMAGE_AI_GENERATION).toBe('IMAGE_AI_GENERATION');
      expect(CATEGORIES.IMAGE_MANIPULATION).toBe('IMAGE_MANIPULATION');
      expect(CATEGORIES.IMAGE_PROVENANCE).toBe('IMAGE_PROVENANCE');
      expect(CATEGORIES.TEXT_AI_GENERATION).toBe('TEXT_AI_GENERATION');
      expect(ASSESSMENTS.PASS).toBe('PASS');
      expect(ASSESSMENTS.LIKELY_AI_GENERATED).toBe('LIKELY_AI_GENERATED');
      expect(SOURCES.HEURISTIC).toBe('HEURISTIC');
      expect(SOURCES.MODEL).toBe('MODEL');
    });

    it('should correctly normalize descriptive assessment strings', () => {
      expect(EvidenceTypes.normalizeAssessment('HIGH')).toBe(ASSESSMENTS.HIGH_RISK);
      expect(EvidenceTypes.normalizeAssessment('CRITICAL')).toBe(ASSESSMENTS.HIGH_RISK);
      expect(EvidenceTypes.normalizeAssessment('POSSIBLE')).toBe(ASSESSMENTS.SUSPICIOUS);
      expect(EvidenceTypes.normalizeAssessment('UNLIKELY')).toBe(ASSESSMENTS.LOW_RISK);
      expect(EvidenceTypes.normalizeAssessment('VERIFIED')).toBe(ASSESSMENTS.PASS);
      expect(EvidenceTypes.normalizeAssessment('LIKELY_AI_GENERATED')).toBe(ASSESSMENTS.LIKELY_AI_GENERATED);
      expect(EvidenceTypes.normalizeAssessment(null)).toBe(ASSESSMENTS.INCONCLUSIVE);
    });
  });

  describe('EvidenceBuilder', () => {
    it('should build a standardized evidence object with default values', () => {
      const evidence = new EvidenceBuilder().build();
      expect(evidence).toHaveProperty('signal', 'UNKNOWN_SIGNAL');
      expect(evidence).toHaveProperty('category', CATEGORIES.IMAGE_METADATA);
      expect(evidence).toHaveProperty('assessment', ASSESSMENTS.INCONCLUSIVE);
      expect(evidence).toHaveProperty('value', 0);
      expect(evidence).toHaveProperty('confidence', 0.5);
      expect(evidence).toHaveProperty('source', SOURCES.HEURISTIC);
      expect(evidence).toHaveProperty('evidence');
      expect(Array.isArray(evidence.evidence)).toBe(true);
      expect(evidence).toHaveProperty('detectorVersion', '1.0.0');
      expect(evidence).toHaveProperty('modelVersion', null);
      expect(evidence).toHaveProperty('timestamp');
    });

    it('should build a complete evidence item using fluent methods', () => {
      const evidence = new EvidenceBuilder()
        .setSignal('AI_GENERATION')
        .setCategory(CATEGORIES.IMAGE_AI_GENERATION)
        .setAssessment(ASSESSMENTS.LIKELY_AI_GENERATED)
        .setValue(0.82)
        .setConfidence(0.91)
        .setSource(SOURCES.MODEL)
        .setEvidence(['C2PA manifest header matches DALL-E 3'])
        .setRawSignal({ header: 'c2pa' })
        .setDetectorVersion('2.1.0')
        .setModelVersion('forensics-v1')
        .build();

      expect(evidence.signal).toBe('AI_GENERATION');
      expect(evidence.category).toBe('IMAGE_AI_GENERATION');
      expect(evidence.assessment).toBe('LIKELY_AI_GENERATED');
      expect(evidence.value).toBe(0.82);
      expect(evidence.confidence).toBe(0.91);
      expect(evidence.source).toBe('MODEL');
      expect(evidence.evidence).toEqual(['C2PA manifest header matches DALL-E 3']);
      expect(evidence.rawSignal).toEqual({ header: 'c2pa' });
      expect(evidence.detectorVersion).toBe('2.1.0');
      expect(evidence.modelVersion).toBe('forensics-v1');
    });

    it('should build evidence object via EvidenceBuilder.create static method', () => {
      const evidence = EvidenceBuilder.create({
        signal: 'EXIF_METADATA',
        category: CATEGORIES.IMAGE_METADATA,
        assessment: ASSESSMENTS.PASS,
        value: 1.0,
        confidence: 0.95,
        source: SOURCES.METADATA,
        evidence: ['Camera Make and Model verified'],
        rawSignal: { make: 'Canon', model: 'EOS 5D' },
      });

      expect(evidence.signal).toBe('EXIF_METADATA');
      expect(evidence.category).toBe('IMAGE_METADATA');
      expect(evidence.assessment).toBe('PASS');
      expect(evidence.value).toBe(1.0);
      expect(evidence.source).toBe('METADATA');
    });

    it('should clamp value and confidence between 0 and 1', () => {
      const evidence = EvidenceBuilder.create({
        value: 1.5,
        confidence: -0.2,
      });

      expect(evidence.value).toBe(1);
      expect(evidence.confidence).toBe(0);
    });
  });

  describe('EvidenceAggregator', () => {
    it('should aggregate an array of evidence items by category', () => {
      const e1 = EvidenceBuilder.create({
        signal: 'AI_DETECTION',
        category: CATEGORIES.IMAGE_AI_GENERATION,
        assessment: ASSESSMENTS.LIKELY_AI_GENERATED,
        value: 0.85,
        confidence: 0.9,
      });

      const e2 = EvidenceBuilder.create({
        signal: 'ELA_NOISE',
        category: CATEGORIES.IMAGE_MANIPULATION,
        assessment: ASSESSMENTS.PASS,
        value: 0.1,
        confidence: 0.8,
      });

      const agg = EvidenceAggregator.aggregate([e1, e2]);

      expect(agg.totalCount).toBe(2);
      expect(agg.byCategory[CATEGORIES.IMAGE_AI_GENERATION]).toHaveLength(1);
      expect(agg.byCategory[CATEGORIES.IMAGE_MANIPULATION]).toHaveLength(1);
      expect(agg.summaryAssessment).toBe(ASSESSMENTS.SUSPICIOUS);
    });

    it('should handle empty evidence list gracefully', () => {
      const agg = EvidenceAggregator.aggregate([]);
      expect(agg.totalCount).toBe(0);
      expect(agg.summaryAssessment).toBe(ASSESSMENTS.INCONCLUSIVE);
    });
  });
});
