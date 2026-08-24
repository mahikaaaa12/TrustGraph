const mongoose = require('mongoose');

const graphEdgeSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    target: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    relationship: {
      type: String,
      enum: [
        'USES_DEVICE',
        'USES_IP',
        'ASSOCIATED_EMAIL',
        'USES_PAYMENT_METHOD',
        'EXECUTES_TRANSACTION',
        'MERCHANT_SETTLEMENT',
        'TRANSFERS_TO',
      ],
      required: true,
      index: true,
    },
    weight: {
      type: Number,
      default: 1,
    },
    firstSeen: {
      type: Date,
      default: Date.now,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
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

// Compound indexes for bi-directional traversal
graphEdgeSchema.index({ source: 1, target: 1, relationship: 1 }, { unique: true });
graphEdgeSchema.index({ source: 1, relationship: 1 });
graphEdgeSchema.index({ target: 1, relationship: 1 });

module.exports = mongoose.model('GraphEdge', graphEdgeSchema);
