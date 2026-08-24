const RiskAudit = require('../models/RiskAudit');
const { getDbState } = require('../config/db');

/**
 * Enterprise Risk Audit Trail Service
 * Persists immutable risk decision logs to MongoDB with in-memory ring buffer fallback.
 */
class RiskAuditService {
  constructor(bufferSize = 2000) {
    this.bufferSize = bufferSize;
    this.memoryAuditLog = [];
  }

  isDbActive() {
    return getDbState() === 1;
  }

  /**
   * Records a risk decision audit entry.
   */
  async recordAudit(auditData = {}) {
    const entry = {
      eventId: auditData.eventId || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: auditData.timestamp || new Date(),
      modelVersion: auditData.modelVersion || 'gbdt-risk-v1.0.0',
      policyVersion: auditData.policyVersion || 'policies-v1.2.0',
      decision: auditData.decision || 'REVIEW',
      decisionReason: auditData.decisionReason || '',
      riskScore: typeof auditData.riskScore === 'number' ? auditData.riskScore : 50,
      fraudProbability: typeof auditData.fraudProbability === 'number' ? auditData.fraudProbability : 0.5,
      expectedLoss: typeof auditData.expectedLoss === 'number' ? auditData.expectedLoss : 0.0,
      fallbackUsed: Boolean(auditData.fallbackUsed || auditData.isFallback),
      processingStatus: auditData.processingStatus || (auditData.fallbackUsed ? 'FALLBACK' : 'SUCCESS'),
      topRiskFactors: auditData.topRiskFactors || [],
      graphEvidence: auditData.graphEvidence || {},
      metadata: auditData.metadata || {},
    };

    // 1. Maintain in-memory ring buffer
    this.memoryAuditLog.unshift(entry);
    if (this.memoryAuditLog.length > this.bufferSize) {
      this.memoryAuditLog.pop();
    }

    // 2. Persist to MongoDB if active
    if (this.isDbActive()) {
      try {
        return await RiskAudit.create(entry);
      } catch (err) {
        console.warn('[RiskAuditService] MongoDB audit write failed, persisted in memory:', err.message);
      }
    }

    return entry;
  }

  /**
   * Retrieves audit records by eventId or recent history.
   */
  async getAuditLogs(options = {}) {
    const { eventId, limit = 50, offset = 0 } = options;

    if (this.isDbActive()) {
      try {
        const query = eventId ? { eventId } : {};
        const records = await RiskAudit.find(query)
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit)
          .lean();
        return records;
      } catch (err) {
        console.warn('[RiskAuditService] MongoDB read failed, falling back to memory:', err.message);
      }
    }

    let filtered = this.memoryAuditLog;
    if (eventId) {
      filtered = filtered.filter((r) => r.eventId === eventId);
    }
    return filtered.slice(offset, offset + limit);
  }
}

const defaultRiskAudit = new RiskAuditService();

module.exports = {
  RiskAuditService,
  defaultRiskAudit,
};
