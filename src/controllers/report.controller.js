const ReportService = require('../services/report.service');
const asyncHandler = require('../utils/asyncHandler');
const { HTTP_STATUS } = require('../constants');

class ReportController {
  static getReports = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const result = await ReportService.getUserReports(userId, req.query);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'User forensic reports retrieved.',
      data: result.reports,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  });

  static getReportById = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;

    const report = await ReportService.getReportById(id, userId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Report details retrieved.',
      data: report,
    });
  });

  static createReport = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const report = await ReportService.createReport(userId, req.body);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Forensic audit report generated successfully.',
      data: report,
    });
  });

  static exportReport = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;
    const { format = 'json' } = req.query;

    const exportResult = await ReportService.exportReport(id, userId, format);

    res.set('Content-Type', exportResult.contentType);
    res.set('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
    res.status(HTTP_STATUS.OK).send(exportResult.data);
  });
}

module.exports = ReportController;
