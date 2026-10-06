const { CATEGORIES, ASSESSMENTS, SOURCES, normalizeAssessment } = require('./EvidenceTypes');

/**
 * Reusable Builder for TrustGraph Standardized Evidence Objects
 */
class EvidenceBuilder {
  constructor() {
    this.reset();
  }

  reset() {
    this._signal = 'UNKNOWN_SIGNAL';
    this._category = CATEGORIES.IMAGE_METADATA;
    this._assessment = ASSESSMENTS.INCONCLUSIVE;
    this._value = 0;
    this._confidence = 0.5;
    this._source = SOURCES.HEURISTIC;
    this._evidence = [];
    this._rawSignal = null;
    this._detectorVersion = '1.0.0';
    this._modelVersion = null;
    this._timestamp = new Date().toISOString();
    return this;
  }

  setSignal(signal) {
    this._signal = signal || 'UNKNOWN_SIGNAL';
    return this;
  }

  setCategory(category) {
    if (Object.values(CATEGORIES).includes(category)) {
      this._category = category;
    } else {
      this._category = category || CATEGORIES.IMAGE_METADATA;
    }
    return this;
  }

  setAssessment(assessment) {
    this._assessment = normalizeAssessment(assessment);
    return this;
  }

  setValue(value) {
    const num = Number(value);
    this._value = isNaN(num) ? 0 : Math.max(0, Math.min(1, parseFloat(num.toFixed(4))));
    return this;
  }

  setConfidence(confidence) {
    const num = Number(confidence);
    this._confidence = isNaN(num) ? 0.5 : Math.max(0, Math.min(1, parseFloat(num.toFixed(4))));
    return this;
  }

  setSource(source) {
    if (Object.values(SOURCES).includes(source)) {
      this._source = source;
    } else {
      this._source = source || SOURCES.HEURISTIC;
    }
    return this;
  }

  setEvidence(evidenceList) {
    if (Array.isArray(evidenceList)) {
      this._evidence = evidenceList.map((item) =>
        typeof item === 'string' ? item : item.description || JSON.stringify(item)
      );
    } else if (typeof evidenceList === 'string') {
      this._evidence = [evidenceList];
    }
    return this;
  }

  addEvidence(detail) {
    if (typeof detail === 'string') {
      this._evidence.push(detail);
    } else if (detail && detail.description) {
      this._evidence.push(detail.description);
    } else if (detail) {
      this._evidence.push(JSON.stringify(detail));
    }
    return this;
  }

  setRawSignal(rawSignal) {
    this._rawSignal = rawSignal;
    return this;
  }

  setDetectorVersion(version) {
    this._detectorVersion = version || '1.0.0';
    return this;
  }

  setModelVersion(version) {
    this._modelVersion = version || null;
    return this;
  }

  setTimestamp(ts) {
    this._timestamp = ts ? new Date(ts).toISOString() : new Date().toISOString();
    return this;
  }

  build() {
    return {
      signal: this._signal,
      signalName: this._signal,
      category: this._category,
      assessment: this._assessment,
      value: this._value,
      normalizedValue: this._value,
      confidence: this._confidence,
      source: this._source,
      detectorType: this._source,
      evidence: [...this._evidence],
      rawValue: this._rawSignal,
      rawSignal: this._rawSignal,
      detectorVersion: this._detectorVersion,
      modelVersion: this._modelVersion,
      timestamp: this._timestamp,
    };
  }

  /**
   * One-step creation helper from options object
   */
  static create(options = {}) {
    const builder = new EvidenceBuilder();
    if (options.signal) builder.setSignal(options.signal);
    if (options.category) builder.setCategory(options.category);
    if (options.assessment) builder.setAssessment(options.assessment);
    if (options.value !== undefined) builder.setValue(options.value);
    if (options.confidence !== undefined) builder.setConfidence(options.confidence);
    if (options.source) builder.setSource(options.source);
    if (options.evidence) builder.setEvidence(options.evidence);
    if (options.rawSignal !== undefined) builder.setRawSignal(options.rawSignal);
    if (options.detectorVersion) builder.setDetectorVersion(options.detectorVersion);
    if (options.modelVersion) builder.setModelVersion(options.modelVersion);
    if (options.timestamp) builder.setTimestamp(options.timestamp);
    return builder.build();
  }
}

module.exports = EvidenceBuilder;
