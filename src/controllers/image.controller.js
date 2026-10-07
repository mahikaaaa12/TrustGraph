const path = require('path');
const fs = require('fs');
const ImageService = require('../services/image.service');
const Analysis = require('../models/Analysis');
const asyncHandler = require('../utils/asyncHandler');
const { HTTP_STATUS } = require('../constants');

/**
 * Image Forensics & ELA Controller
 */

exports.analyzeImage = asyncHandler(async (req, res) => {
  const { fileId } = req.body;
  if (!fileId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Please provide a fileId of an uploaded image file.',
    });
  }

  const host = `${req.protocol}://${req.get('host')}`;
  const result = await ImageService.analyzeImage(fileId, req.user._id, host);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Image forensics and Error Level Analysis completed successfully.',
    data: result,
  });
});

const UploadedFile = require('../models/UploadedFile');

exports.getElaHeatmap = asyncHandler(async (req, res) => {
  const analysisRecord = await Analysis.findOne({ _id: req.params.id, userId: req.user._id });
  if (!analysisRecord) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Analysis record not found or access denied.',
    });
  }

  const uploadDir = path.resolve(__dirname, '../uploads');
  let fileName = analysisRecord.graphMetadata?.elaFileName;
  let filePath = fileName ? path.join(uploadDir, fileName) : null;

  if (!filePath || !fs.existsSync(filePath)) {
    let fileRecord = null;
    if (analysisRecord.graphMetadata?.fileId) {
      fileRecord = await UploadedFile.findById(analysisRecord.graphMetadata.fileId);
    }
    if (!fileRecord) {
      fileRecord = await UploadedFile.findOne({
        $or: [{ userId: req.user._id }, { allowedUsers: req.user._id }, { 'userUploads.userId': req.user._id }],
      }).sort({ createdAt: -1 });
    }
    if (fileRecord) {
      filePath = path.join(uploadDir, `ela-${fileRecord.fileName}`);
    }
  }

  if (!filePath || !fs.existsSync(filePath)) {
    filePath = path.join(uploadDir, `ela-${analysisRecord.targetEntity}`);
  }

  if (!fs.existsSync(filePath)) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'ELA heatmap image file not found on disk.',
    });
  }

  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  fs.createReadStream(filePath).pipe(res);
});
