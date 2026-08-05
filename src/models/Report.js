const mongoose = require('mongoose');

/**
 * Report Schema definition for generated TrustGraph analysis summaries.
 */
const reportSchema = new mongoose.Schema(
  {
    analysisId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Analysis',
      required: [true, 'Report must link to an Analysis record'],
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
    summary: {
      type: String,
      required: [true, 'Report executive summary is required'],
    },
    pdfUrl: {
      type: String,
      default: null,
    },
    exportFormat: {
      type: String,
      enum: ['json', 'pdf', 'csv'],
      default: 'json',
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
    metadata: {
      type: Map,
      of: String,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

reportSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
