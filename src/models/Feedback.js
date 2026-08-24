const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    analysisId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Analysis',
      required: [true, 'Feedback must link to an Analysis record'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Feedback reviewer ID is required'],
      index: true,
    },
    actualLabel: {
      type: String,
      enum: ['LEGITIMATE', 'FRAUD_SUSPICIOUS', 'CONFIRMED_FRAUD'],
      required: true,
    },
    isCorrectPrediction: {
      type: Boolean,
      required: true,
    },
    analystNotes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Feedback', feedbackSchema);
