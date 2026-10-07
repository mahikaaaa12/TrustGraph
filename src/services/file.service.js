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
    const shortChecksum = checksum.substring(0, 12);
    console.log(`[UploadedFile] checksum calculated: ${shortChecksum}...`);

    // 1. Deduplication check: See if identical content exists in system by global checksum
    let existingFile = await UploadedFile.findOne({ checksum });

    if (existingFile) {
      console.log(`[UploadedFile] existing record found: ${existingFile._id} for checksum: ${shortChecksum}`);

      const isDirectOwner = existingFile.userId && existingFile.userId.toString() === userId.toString();
      const isAllowedUser =
        Array.isArray(existingFile.allowedUsers) &&
        existingFile.allowedUsers.some((u) => u.toString() === userId.toString());
      const isOwner = isDirectOwner || isAllowedUser;

      if (isOwner) {
        console.log(`[UploadedFile] ownership verified for user: ${userId}`);
        console.log(`[UploadedFile] reusing/reprocessing existing record: ${existingFile._id}`);

        if (fs.existsSync(existingFile.filePath)) {
          // Physical file exists on disk. Clean up the new duplicate temporary file
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
          // Physical file on disk was missing (e.g. server restart/disk wipe).
          // Update database record with the new physical file path
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
      } else {
        // Different user uploaded identical file content!
        // Preserve user isolation: Do NOT leak filename, storage path, or analysis between users!
        console.log(`[UploadedFile] different user upload detected. Registering authorized access with user isolation.`);

        // Clean up duplicate disk file
        if (fs.existsSync(file.path) && file.path !== existingFile.filePath) {
          try {
            fs.unlinkSync(file.path);
          } catch (e) {
            console.warn('[FileService] Unlink duplicate warning:', e.message);
          }
        }

        // Atomically register userId in allowedUsers and userUploads
        existingFile = await UploadedFile.findOneAndUpdate(
          { _id: existingFile._id },
          {
            $addToSet: { allowedUsers: userId },
            $push: {
              userUploads: {
                userId,
                originalName: file.originalname,
                uploadedAt: new Date(),
              },
            },
          },
          { new: true }
        );

        // Audit log for this user's upload action
        await History.create({
          userId,
          action: 'UPLOAD',
          entityId: existingFile._id,
          entityType: 'UploadedFile',
          details: {
            originalName: file.originalname,
            size: file.size,
            mimeType: file.mimetype,
            deduplicated: true,
          },
        });

        return {
          isDuplicate: true,
          fileRecord: existingFile,
          url: `${reqHost}/uploads/${existingFile.fileName}`,
        };
      }
    }

    // 2. Persist new file record in database with defensive E11000 duplicate handling
    try {
      const fileRecord = await UploadedFile.create({
        userId,
        originalName: file.originalname,
        fileName: file.filename,
        mimeType: file.mimetype,
        fileSizeBytes: file.size,
        filePath: file.path,
        checksum,
        allowedUsers: [userId],
        userUploads: [
          {
            userId,
            originalName: file.originalname,
            uploadedAt: new Date(),
          },
        ],
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
    } catch (err) {
      // Defensive E11000 duplicate key handler for race conditions
      if (err.code === 11000 || (err.message && err.message.includes('E11000'))) {
        console.log(`[UploadedFile] E11000 caught defensively during concurrent insert for checksum: ${shortChecksum}`);

        if (fs.existsSync(file.path)) {
          try {
            fs.unlinkSync(file.path);
          } catch (e) {}
        }

        const racedFile = await UploadedFile.findOne({ checksum });
        if (racedFile) {
          const isDirectOwner = racedFile.userId && racedFile.userId.toString() === userId.toString();
          if (!isDirectOwner) {
            await UploadedFile.updateOne(
              { _id: racedFile._id },
              {
                $addToSet: { allowedUsers: userId },
                $push: {
                  userUploads: {
                    userId,
                    originalName: file.originalname,
                    uploadedAt: new Date(),
                  },
                },
              }
            );
          }

          return {
            isDuplicate: true,
            fileRecord: racedFile,
            url: `${reqHost}/uploads/${racedFile.fileName}`,
          };
        }
      }

      throw err;
    }
  }

  /**
   * Fetches file record by ID ensuring user ownership or authorization.
   */
  static async getFileById(fileId, userId) {
    const fileRecord = await UploadedFile.findOne({
      _id: fileId,
      $or: [{ userId }, { allowedUsers: userId }, { 'userUploads.userId': userId }],
    });
    if (!fileRecord) {
      throw new AppError('File not found or access denied.', HTTP_STATUS.NOT_FOUND);
    }
    return fileRecord;
  }

  /**
   * Fetches all files accessible to a specific user.
   */
  static async getUserFiles(userId) {
    return await UploadedFile.find({
      $or: [{ userId }, { allowedUsers: userId }, { 'userUploads.userId': userId }],
    }).sort({ createdAt: -1 });
  }
}

module.exports = FileService;
