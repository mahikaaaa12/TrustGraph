const DocumentService = require('../services/document.service');
const asyncHandler = require('../utils/asyncHandler');
const { HTTP_STATUS } = require('../constants');

/**
 * Controller for Document Parsing and Trust Analysis HTTP Endpoints
 */

exports.analyzeDocument = asyncHandler(async (req, res) => {
  const { fileId } = req.body;
  if (!fileId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Please provide a fileId to perform document analysis.',
    });
  }

  const analysisResult = await DocumentService.analyzeDocument(fileId, req.user._id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Document analyzed successfully.',
    data: analysisResult,
  });
});
