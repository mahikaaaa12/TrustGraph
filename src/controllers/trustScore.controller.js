const TrustScoreService = require('../services/trustScore.service');
const asyncHandler = require('../utils/asyncHandler');
const { HTTP_STATUS } = require('../constants');

/**
 * Multi-Modal Trust Score Engine Controller
 */

exports.evaluateTrustScore = asyncHandler(async (req, res) => {
  const result = await TrustScoreService.evaluateTrustScore(req.body, req.user._id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Multi-modal Trust Score evaluation computed successfully.',
    data: result,
  });
});
