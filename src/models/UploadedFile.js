const mongoose = require('mongoose');

/**
 * UploadedFile Schema definition for ingested data files (CSV, JSON, PDFs) for TrustGraph parsing.
 */
const uploadedFileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploaded file must belong to a User'],
      index: true,
    },
    originalName: {
      type: String,
      required: [true, 'Original file name is required'],
      trim: true,
    },
    fileName: {
      type: String,
      required: [true, 'Server file name is required'],
      unique: true,
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
    },
    fileSizeBytes: {
      type: Number,
      required: [true, 'File size is required'],
      min: [1, 'File size must be greater than 0 bytes'],
    },
    filePath: {
      type: String,
      required: [true, 'File storage path is required'],
    },
    checksum: {
      type: String,
      required: [true, 'File SHA256 checksum is required'],
      unique: true, // Prevents storing duplicate file contents
      index: true,
    },
    isProcessed: {
      type: Boolean,
      default: false,
    },
    processingError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

uploadedFileSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('UploadedFile', uploadedFileSchema);
