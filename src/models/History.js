const mongoose = require('mongoose');

/**
 * Audit History Schema definition for tracking user activities and security audit logs.
 */
const historySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'History log must be tied to a User'],
      index: true,
    },
    action: {
      type: String,
      required: [true, 'Action name is required'],
      enum: ['UPLOAD', 'ANALYSIS_RUN', 'REPORT_GENERATED', 'TRUST_SCORE_QUERY', 'SETTINGS_CHANGE'],
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'entityType', // Dynamic ref path matching target model name
    },
    entityType: {
      type: String,
      enum: ['Analysis', 'Report', 'UploadedFile', 'User'],
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '0.0.0.0',
    },
    userAgent: {
      type: String,
      default: 'Unknown',
    },
  },
  {
    timestamps: true,
  }
);

// Compound Index for fast user timeline filtering
historySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('History', historySchema);
