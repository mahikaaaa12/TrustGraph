const mongoose = require('mongoose');

const graphNodeSchema = new mongoose.Schema(
  {
    nodeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    entityType: {
      type: String,
      enum: ['customer', 'merchant', 'transaction', 'device', 'ip', 'email', 'payment_method'],
      required: true,
      index: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    riskCategory: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 15,
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

// Compound index for fast lookup by entity type and ID
graphNodeSchema.index({ entityType: 1, nodeId: 1 });

module.exports = mongoose.model('GraphNode', graphNodeSchema);
