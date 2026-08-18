const HistoryService = require('../services/history.service');
const { HTTP_STATUS } = require('../constants');

class HistoryController {
  static async getHistory(req, res, next) {
    try {
      const userId = req.user._id;
      const result = await HistoryService.getHistory(userId, req.query);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getHistoryStats(req, res, next) {
    try {
      const userId = req.user._id;
      const stats = await HistoryService.getHistoryStats(userId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: stats,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAnalysisById(req, res, next) {
    try {
      const userId = req.user._id;
      const { id } = req.params;

      const record = await HistoryService.getAnalysisById(id, userId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: record,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = HistoryController;
