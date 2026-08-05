const TextService = require('../services/text.service');
const asyncHandler = require('../utils/asyncHandler');
const { HTTP_STATUS } = require('../constants');

/**
 * Text Authenticity, AI Detection & Sentiment Controller
 */

exports.analyzeText = asyncHandler(async (req, res) => {
  const { text, benchmarkText } = req.body;

  if (!text) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Please provide text string payload to analyze.',
    });
  }

  const result = await TextService.analyzeText(text, req.user._id, benchmarkText);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Text authenticity and NLP analysis completed successfully.',
    data: result,
  });
});
