const ImageService = require('../services/image.service');
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
