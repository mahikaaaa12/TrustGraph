const mongoose = require('mongoose');
const Report = require('../models/Report');
const Analysis = require('../models/Analysis');
const AppError = require('../utils/appError');
const { HTTP_STATUS } = require('../constants');

class ReportService {
  /**
   * Generates a new Report document linked to an existing Analysis record.
   */
  static async createReport(analysisId, userId, options = {}) {
    const analysis = await Analysis.findOne({ _id: analysisId, userId });
    if (!analysis) {
      throw new AppError('Analysis record not found or access denied.', HTTP_STATUS.NOT_FOUND);
    }

    const title = options.title || `Executive Security Audit: ${analysis.targetEntity}`;
    const summary = options.summary || `Analysis completed with overall trust score of ${analysis.trustScore}/100. Categorized as ${analysis.riskCategory.toUpperCase()} risk profile. Confidence level: ${(analysis.confidenceScore * 100).toFixed(0)}%.`;

    const report = await Report.create({
      analysisId: analysis._id,
      userId,
      title,
      summary,
      exportFormat: options.exportFormat || 'json',
      metadata: {
        targetEntity: analysis.targetEntity,
        entityType: analysis.entityType,
        riskCategory: analysis.riskCategory,
        trustScore: String(analysis.trustScore),
      },
    });

    return report;
  }

  /**
   * List user's reports.
   */
  static async getUserReports(userId) {
    const reports = await Report.find({ userId })
      .populate('analysisId')
      .sort({ createdAt: -1 })
      .lean();

    return reports;
  }

  /**
   * Get single report by ID.
   */
  static async getReportById(reportId, userId) {
    const report = await Report.findOne({ _id: reportId, userId })
      .populate('analysisId')
      .lean();

    if (!report) {
      throw new AppError('Report record not found or access denied.', HTTP_STATUS.NOT_FOUND);
    }

    return report;
  }
}

module.exports = ReportService;
