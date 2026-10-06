const DashboardService = require('../services/dashboard.service');
const { HTTP_STATUS } = require('../constants');

class DashboardController {
  static async getSummary(req, res, next) {
    try {
      const userId = req.user._id;
      const data = await DashboardService.getSummary(userId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getCreatorSummary(req, res, next) {
    try {
      const userId = req.user._id;
      const data = await DashboardService.getCreatorSummary(userId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = DashboardController;
