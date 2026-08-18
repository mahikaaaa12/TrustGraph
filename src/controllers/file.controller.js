const FileService = require('../services/file.service');
const asyncHandler = require('../utils/asyncHandler');
const { HTTP_STATUS } = require('../constants');

/**
 * File Upload Transport Controller
 */

exports.uploadSingleFile = asyncHandler(async (req, res) => {
  const fileObj = req.file || (req.files && (req.files.file?.[0] || req.files.image?.[0] || req.files[0]));
  if (!fileObj) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'No file was uploaded. Please make sure the form field is named "file" or "image".',
    });
  }

  const host = `${req.protocol}://${req.get('host')}`;
  const result = await FileService.processUploadedFile(fileObj, req.user._id, host);

  res.status(result.isDuplicate ? HTTP_STATUS.OK : HTTP_STATUS.CREATED).json({
    success: true,
    message: result.isDuplicate
      ? 'File content already exists in system (deduplicated).'
      : 'File uploaded and parsed successfully.',
    data: {
      file: result.fileRecord,
      url: result.url,
      isDuplicate: result.isDuplicate,
    },
  });
});

exports.uploadMultipleFiles = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'No files uploaded.',
    });
  }

  const host = `${req.protocol}://${req.get('host')}`;
  const uploadResults = [];

  for (const file of req.files) {
    const result = await FileService.processUploadedFile(file, req.user._id, host);
    uploadResults.push({
      originalName: file.originalname,
      url: result.url,
      fileId: result.fileRecord._id,
      isDuplicate: result.isDuplicate,
    });
  }

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: `${uploadResults.length} files processed successfully.`,
    data: uploadResults,
  });
});

exports.getFileById = asyncHandler(async (req, res) => {
  const fileRecord = await FileService.getFileById(req.params.id, req.user._id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { file: fileRecord },
  });
});

exports.getMyFiles = asyncHandler(async (req, res) => {
  const files = await FileService.getUserFiles(req.user._id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    count: files.length,
    data: { files },
  });
});
