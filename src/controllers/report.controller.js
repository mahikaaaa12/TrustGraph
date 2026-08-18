const ReportService = require('../services/report.service');
const { HTTP_STATUS } = require('../constants');

class ReportController {
  static async getReports(req, res, next) {
    try {
      const userId = req.user._id;
      const reports = await ReportService.getUserReports(userId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: reports,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getReportById(req, res, next) {
    try {
      const userId = req.user._id;
      const { id } = req.params;

      const report = await ReportService.getReportById(id, userId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: report,
      });
    } catch (err) {
      next(err);
    }
  }

  static async createReport(req, res, next) {
    try {
      const userId = req.user._id;
      const { analysisId, title, summary, exportFormat } = req.body;

      const report = await ReportService.createReport(analysisId, userId, {
        title,
        summary,
        exportFormat,
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: report,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ReportController;
