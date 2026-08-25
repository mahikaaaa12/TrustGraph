const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const UploadedFile = require('../models/UploadedFile');
const History = require('../models/History');
const AppError = require('../utils/appError');
const { HTTP_STATUS } = require('../constants');

/**
 * Service Layer for Handling File Upload Ingestion & Persistence
 */
class FileService {
  /**
   * Computes SHA256 checksum of a file on disk.
   */
  static computeChecksum(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Processes an uploaded file, verifies checksum uniqueness, and persists database records.
   */
  static async processUploadedFile(file, userId, reqHost = '') {
    if (!file) {
      throw new AppError('No file was uploaded.', HTTP_STATUS.BAD_REQUEST);
    }

    const checksum = this.computeChecksum(file.path);

    // Deduplication check: See if identical content was uploaded previously by this user
    const existingFile = await UploadedFile.findOne({ checksum, userId });
    if (existingFile) {
      if (fs.existsSync(existingFile.filePath)) {
        // Physical file exists on disk. Clean up the new duplicate file
        if (fs.existsSync(file.path) && file.path !== existingFile.filePath) {
          try {
            fs.unlinkSync(file.path);
          } catch (e) {
            console.warn('[FileService] Unlink duplicate warning:', e.message);
          }
        }

        return {
          isDuplicate: true,
          fileRecord: existingFile,
          url: `${reqHost}/uploads/${existingFile.fileName}`,
        };
      } else {
        // Physical file on disk was missing (e.g. server restart/ephemeral disk wipe on Render).
        // Update database record with the new valid physical file path
        existingFile.filePath = file.path;
        existingFile.fileName = file.filename;
        existingFile.mimeType = file.mimetype;
        existingFile.fileSizeBytes = file.size;
        await existingFile.save();

        return {
          isDuplicate: false,
          fileRecord: existingFile,
          url: `${reqHost}/uploads/${existingFile.fileName}`,
        };
      }
    }

    // Persist file record in database
    const fileRecord = await UploadedFile.create({
      userId,
      originalName: file.originalname,
      fileName: file.filename,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      filePath: file.path,
      checksum,
      isProcessed: true,
    });

    // Log Audit event in History collection
    await History.create({
      userId,
      action: 'UPLOAD',
      entityId: fileRecord._id,
      entityType: 'UploadedFile',
      details: {
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      },
    });

    const fileUrl = `${reqHost}/uploads/${file.filename}`;

    return {
      isDuplicate: false,
      fileRecord,
      url: fileUrl,
    };
  }

  /**
   * Fetches file record by ID.
   */
  static async getFileById(fileId, userId) {
    const fileRecord = await UploadedFile.findOne({ _id: fileId, userId });
    if (!fileRecord) {
      throw new AppError('File not found or access denied.', HTTP_STATUS.NOT_FOUND);
    }
    return fileRecord;
  }

  /**
   * Fetches all files uploaded by a specific user.
   */
  static async getUserFiles(userId) {
    return await UploadedFile.find({ userId }).sort({ createdAt: -1 });
  }
}

module.exports = FileService;
