const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AppError = require('../utils/appError');
const { HTTP_STATUS } = require('../constants');

// Allowed extensions and MIME types mapping for security
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'application/msword', // DOC
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.doc', '.jpg', '.jpeg', '.png', '.webp', '.gif']);

// Ensure uploads directory exists on disk
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Storage Engine Configuration:
 * Writes files directly to disk with sanitized, collision-resistant unique names.
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitize original filename (remove special chars, preserve extension)
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${sanitizedBase}-${uniqueSuffix}${ext}`);
  },
});

/**
 * Strict File Filter:
 * Validates both the MIME type and the file extension to prevent spoofing.
 */
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype.toLowerCase();

  const isExtensionValid = ALLOWED_EXTENSIONS.has(ext);
  const isMimeValid = ALLOWED_MIME_TYPES.has(mimeType);

  if (isExtensionValid && isMimeValid) {
    return cb(null, true);
  }

  cb(
    new AppError(
      `Invalid file format (${ext} / ${mimeType}). Only PDF, DOCX, and JPEG/PNG/WEBP/GIF images are allowed.`,
      HTTP_STATUS.BAD_REQUEST
    ),
    false
  );
};

// 10 Megabytes limit per file
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
});

module.exports = upload;
