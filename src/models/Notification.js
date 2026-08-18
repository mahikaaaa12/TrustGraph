const mongoose = require('mongoose');

/**
 * Notification Schema definition for user notifications and security alerts.
 */
const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification must belong to a User'],
      index: true,
    },
    type: {
      type: String,
      enum: ['ANALYSIS_COMPLETE', 'CRITICAL_THREAT', 'SUSPICIOUS_WEBSITE', 'PII_DETECTED', 'REPORT_GENERATED', 'SYSTEM_ALERT'],
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
    },
    severity: {
      type: String,
      enum: ['info', 'success', 'warning', 'critical'],
      default: 'info',
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Analysis',
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
