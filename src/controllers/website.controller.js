const WebsiteService = require('../services/website.service');
const asyncHandler = require('../utils/asyncHandler');
const { HTTP_STATUS } = require('../constants');

/**
 * Website Security & Phishing Analyzer Controller
 */

exports.analyzeWebsite = asyncHandler(async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Please provide a website url to analyze.',
    });
  }

  const result = await WebsiteService.analyzeWebsite(url, req.user._id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Website security and SSL analysis completed successfully.',
    data: result,
  });
});
