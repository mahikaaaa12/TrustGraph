const mongoose = require('mongoose');

const riskAuditSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    modelVersion: {
      type: String,
      default: 'gbdt-risk-v1.0.0',
    },
    policyVersion: {
      type: String,
      default: 'policies-v1.2.0',
    },
    decision: {
      type: String,
      enum: ['ALLOW', 'REVIEW', 'BLOCK'],
      required: true,
      index: true,
    },
    decisionReason: {
      type: String,
      default: '',
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    fraudProbability: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.0,
    },
    expectedLoss: {
      type: Number,
      min: 0,
      default: 0.0,
    },
    fallbackUsed: {
      type: Boolean,
      default: false,
      index: true,
    },
    processingStatus: {
      type: String,
      enum: ['SUCCESS', 'FALLBACK', 'IDEMPOTENT_REPLAY', 'PARTIAL_ERROR'],
      default: 'SUCCESS',
      index: true,
    },
    topRiskFactors: {
      type: Array,
      default: [],
    },
    graphEvidence: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// TTL index to auto-expire old audit logs after 90 days
riskAuditSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
riskAuditSchema.index({ eventId: 1, createdAt: -1 });

module.exports = mongoose.model('RiskAudit', riskAuditSchema);
