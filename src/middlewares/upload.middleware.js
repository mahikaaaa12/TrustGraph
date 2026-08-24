const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const AppError = require('../utils/appError');
const { HTTP_STATUS } = require('../constants');

// Allowed MIME types
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'application/msword', // DOC
  'text/plain',
  'text/markdown',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.doc', '.txt', '.md', '.jpg', '.jpeg', '.png', '.webp', '.gif']);

const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.bash', '.php', '.phtml', '.py',
  '.pl', '.cgi', '.js', '.vbs', '.msi', '.dll', '.scr', '.com',
];

// Target Upload Directory - Normalized absolute path
const uploadDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Storage Engine Configuration:
 * Writes files directly to disk with sanitized, collision-resistant unique names
 * and strict path traversal protection.
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const rawExt = path.extname(file.originalname).toLowerCase();
    // Sanitize base name and strip directory traversal sequences
    const sanitizedBase = path
      .basename(file.originalname, rawExt)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 40);

    const randomEntropy = crypto.randomBytes(8).toString('hex');
    const safeFilename = `${sanitizedBase || 'upload'}-${Date.now()}-${randomEntropy}${rawExt}`;

    // Verify resolved target path remains inside upload directory
    const resolvedPath = path.resolve(uploadDir, safeFilename);
    if (!resolvedPath.startsWith(uploadDir)) {
      return cb(new AppError('Path traversal detected in upload filename.', HTTP_STATUS.BAD_REQUEST));
    }

    cb(null, safeFilename);
  },
});

/**
 * Strict File Filter:
 * Validates extension, blocks multi-extension spoofing, and checks MIME.
 */
const fileFilter = (req, file, cb) => {
  const originalNameLower = file.originalname.toLowerCase();
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = (file.mimetype || '').toLowerCase();

  // 1. Check for dangerous extensions anywhere in the filename (e.g., shell.php.jpg)
  for (const dangerous of DANGEROUS_EXTENSIONS) {
    if (originalNameLower.includes(dangerous)) {
      return cb(
        new AppError(
          `Executable or dangerous script extension detected in file name (${dangerous}). Upload blocked.`,
          HTTP_STATUS.BAD_REQUEST
        ),
        false
      );
    }
  }

  // 2. Extension & MIME verification
  const isExtensionValid = ALLOWED_EXTENSIONS.has(ext);
  const isMimeValid = ALLOWED_MIME_TYPES.has(mimeType) || mimeType.startsWith('text/');

  if (!isExtensionValid || !isMimeValid) {
    return cb(
      new AppError(
        `Invalid file format (${ext} / ${mimeType}). Only PDF, DOCX, TXT, MD, and JPEG/PNG/WEBP images are allowed.`,
        HTTP_STATUS.BAD_REQUEST
      ),
      false
    );
  }

  cb(null, true);
};

// 10 Megabytes limit per file
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1, // Only 1 file per request
  },
});

module.exports = upload;
