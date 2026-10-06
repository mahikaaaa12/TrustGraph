const mongoose = require('mongoose');

/**
 * Report Schema definition for generated TrustGraph audit, forensic, and creator verification reports.
 */
const reportSchema = new mongoose.Schema(
  {
    reportId: {
      type: String,
      index: true,
    },
    analysisId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Analysis',
      required: false,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Report must belong to a User'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Report title is required'],
      trim: true,
    },
    analysisType: {
      type: String,
      enum: [
        'document',
        'image',
        'website',
        'text',
        'trust_score',
        'transaction',
        'system',
        'creator_verification',
        'creator_package',
        'brand_collaboration',
        'batch_analysis',
      ],
      default: 'trust_score',
      index: true,
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 15,
    },
    fraudProbability: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.15,
    },
    decision: {
      type: String,
      enum: ['ALLOW', 'REVIEW', 'BLOCK'],
      default: 'ALLOW',
      index: true,
    },
    riskCategory: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
      index: true,
    },
    expectedLoss: {
      type: Number,
      default: 0.0,
    },
    modelVersion: {
      type: String,
      default: 'gbdt-risk-v1.0.0',
      index: true,
    },
    policyVersion: {
      type: String,
      default: 'policies-v1.2.0',
    },
    summary: {
      type: String,
      required: [true, 'Report executive summary is required'],
    },
    targetEntity: {
      type: String,
      default: 'System Audit',
    },
    topRiskFactors: {
      type: Array,
      default: [],
    },
    graphSignals: {
      type: Array,
      default: [],
    },
    recommendations: {
      type: [String],
      default: [],
    },
    exportFormat: {
      type: String,
      enum: ['json', 'csv', 'pdf'],
      default: 'json',
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

// Compound indexes for fast filtered queries and pagination
reportSchema.index({ userId: 1, createdAt: -1 });
reportSchema.index({ userId: 1, decision: 1, createdAt: -1 });
reportSchema.index({ userId: 1, riskCategory: 1, createdAt: -1 });
reportSchema.index({ userId: 1, analysisType: 1, createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
