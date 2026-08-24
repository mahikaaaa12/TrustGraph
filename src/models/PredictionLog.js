const mongoose = require('mongoose');

const predictionLogSchema = new mongoose.Schema(
  {
    predictionId: {
      type: String,
      required: true,
      unique: true,
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
      required: true,
      default: 'gbdt-risk-v1.0.0',
    },
    featureVersion: {
      type: String,
      default: 'features-v1.0.0',
    },
    riskProbability: {
      type: Number,
      min: 0,
      max: 1,
      required: true,
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    decision: {
      type: String,
      enum: ['ALLOW', 'REVIEW', 'BLOCK'],
      default: 'ALLOW',
    },
    expectedLoss: {
      type: Number,
      default: 0.0,
    },
    inferenceLatencyMs: {
      type: Number,
      default: 0,
    },
    sanitizedFeatures: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    actualLabel: {
      type: String,
      enum: ['FRAUD', 'LEGITIMATE', 'UNKNOWN', 'UNLABELED'],
      default: 'UNLABELED',
      index: true,
    },
    reviewedBy: {
      type: String,
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// TTL index to expire telemetry logs after 60 days
predictionLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });
predictionLogSchema.index({ actualLabel: 1, modelVersion: 1 });

module.exports = mongoose.model('PredictionLog', predictionLogSchema);
