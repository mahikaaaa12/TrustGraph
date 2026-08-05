const mongoose = require('mongoose');

/**
 * Analysis Schema definition for TrustGraph AI graph/node evaluation.
 */
const analysisSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Analysis must belong to a User'],
      index: true,
    },
    targetEntity: {
      type: String,
      required: [true, 'Target entity identifier is required'],
      trim: true,
    },
    entityType: {
      type: String,
      required: [true, 'Entity type is required'],
      enum: ['user', 'organization', 'content', 'domain'],
    },
    trustScore: {
      type: Number,
      min: 0,
      max: 100,
      required: [true, 'Calculated trust score is required'],
    },
    confidenceScore: {
      type: Number,
      min: 0.0,
      max: 1.0,
      default: 0.95,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    riskCategory: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
    },
    vectorEmbedding: {
      type: [Number], // AI Vector representation array
      default: [],
    },
    insights: [
      {
        type: String,
      },
    ],
    graphMetadata: {
      nodeCount: { type: Number, default: 0 },
      edgeCount: { type: Number, default: 0 },
      centralityScore: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// Compound Index for fast user activity lookups ordered by creation date
analysisSchema.index({ userId: 1, createdAt: -1 });

// Compound Index for entity lookup
analysisSchema.index({ targetEntity: 1, entityType: 1 });

module.exports = mongoose.model('Analysis', analysisSchema);
