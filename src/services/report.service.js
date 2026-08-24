const Report = require('../models/Report');
const Analysis = require('../models/Analysis');
const { defaultRiskAudit } = require('./riskAudit.service');
const { getDbState } = require('../config/db');
const AppError = require('../utils/appError');
const { HTTP_STATUS } = require('../constants');

/**
 * Enterprise Dynamic Report Service
 * Generates, queries, filters, paginates, and exports forensic audit reports.
 */
class ReportService {
  static memoryReports = new Map();

  static isDbActive() {
    return getDbState() === 1;
  }

  /**
   * Generates a new Report document linked to an existing Analysis or Risk Decision.
   */
  static async createReport(userId, payload = {}) {
    const {
      analysisId,
      title,
      summary,
      analysisType = 'trust_score',
      targetEntity,
      riskScore,
      fraudProbability,
      decision,
      riskCategory,
      expectedLoss,
      modelVersion = 'gbdt-risk-v1.0.0',
      policyVersion = 'policies-v1.2.0',
      topRiskFactors = [],
      graphSignals = [],
      recommendations = [],
      exportFormat = 'json',
    } = payload;

    let resolvedAnalysis = null;
    if (analysisId) {
      if (this.isDbActive()) {
        resolvedAnalysis = await Analysis.findOne({ _id: analysisId, userId }).lean();
      }
    }

    const calculatedRiskScore =
      typeof riskScore === 'number'
        ? riskScore
        : resolvedAnalysis
        ? parseFloat((100 - resolvedAnalysis.trustScore).toFixed(1))
        : 15.0;

    const calculatedProb =
      typeof fraudProbability === 'number'
        ? fraudProbability
        : parseFloat((calculatedRiskScore / 100).toFixed(4));

    const calculatedDecision =
      decision || (calculatedRiskScore >= 75 ? 'BLOCK' : calculatedRiskScore >= 40 ? 'REVIEW' : 'ALLOW');

    const calculatedCategory =
      riskCategory ||
      (calculatedRiskScore >= 75 ? 'critical' : calculatedRiskScore >= 50 ? 'high' : calculatedRiskScore >= 25 ? 'medium' : 'low');

    const entityName =
      targetEntity || resolvedAnalysis?.targetEntity || payload.target || 'General Transaction Audit';

    const reportTitle =
      title || `Forensic Security Report: ${entityName}`;

    const reportSummary =
      summary ||
      `Evaluated ${entityName} (${analysisType}) with calibrated Risk Score of ${calculatedRiskScore}/100 (P(Fraud): ${(calculatedProb * 100).toFixed(1)}%). Policy engine assigned deterministic verdict: ${calculatedDecision}.`;

    const defaultRecs =
      recommendations.length > 0
        ? recommendations
        : calculatedDecision === 'BLOCK'
        ? [
            'Immediate authorization block and merchant hold recommended.',
            'Trigger compliance manual KYC re-verification.',
            'Add hardware fingerprint and IP to internal watchlist.',
          ]
        : calculatedDecision === 'REVIEW'
        ? [
            'Route transaction to manual analyst queue.',
            'Request step-up SMS / 2FA biometric verification.',
          ]
        : ['Transaction meets standard risk thresholds; permit standard settlement.'];

    const reportDoc = {
      reportId: `RPT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      analysisId: resolvedAnalysis ? resolvedAnalysis._id : analysisId || null,
      userId,
      title: reportTitle,
      summary: reportSummary,
      analysisType: resolvedAnalysis ? resolvedAnalysis.entityType : analysisType,
      targetEntity: entityName,
      riskScore: calculatedRiskScore,
      fraudProbability: calculatedProb,
      decision: calculatedDecision,
      riskCategory: calculatedCategory,
      expectedLoss: typeof expectedLoss === 'number' ? expectedLoss : parseFloat((calculatedProb * 100).toFixed(2)),
      modelVersion,
      policyVersion,
      topRiskFactors: topRiskFactors.length > 0 ? topRiskFactors : resolvedAnalysis?.insights || [],
      graphSignals,
      recommendations: defaultRecs,
      exportFormat,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let createdReport;
    if (this.isDbActive()) {
      try {
        createdReport = await Report.create(reportDoc);
      } catch (err) {
        console.warn('[ReportService] MongoDB write failed, using in-memory store:', err.message);
      }
    }

    if (!createdReport) {
      createdReport = { _id: reportDoc.reportId, ...reportDoc };
      this.memoryReports.set(reportDoc.reportId, createdReport);
    }

    // Record audit trail
    await defaultRiskAudit.recordAudit({
      eventId: `audit_rpt_${createdReport.reportId || createdReport._id}`,
      action: 'REPORT_GENERATED',
      decision: calculatedDecision,
      riskScore: calculatedRiskScore,
      modelVersion,
      policyVersion,
      actor: String(userId),
      reason: `Generated audit report for ${entityName}`,
    });

    return createdReport;
  }

  /**
   * Lists user's reports with multi-field filtering, sorting, and pagination.
   */
  static async getUserReports(userId, queryParams = {}) {
    const page = Math.max(1, parseInt(queryParams.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit) || 10));
    const skip = (page - 1) * limit;

    const { decision, riskCategory, riskLevel, analysisType, modelVersion, startDate, endDate, sortBy = 'createdAt', sortOrder = 'desc' } = queryParams;

    if (this.isDbActive()) {
      try {
        const filter = { userId };

        if (decision) filter.decision = decision.toUpperCase();
        if (riskCategory || riskLevel) filter.riskCategory = (riskCategory || riskLevel).toLowerCase();
        if (analysisType) filter.analysisType = analysisType.toLowerCase();
        if (modelVersion) filter.modelVersion = modelVersion;

        if (startDate || endDate) {
          filter.createdAt = {};
          if (startDate) filter.createdAt.$gte = new Date(startDate);
          if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const sortDirection = sortOrder.toLowerCase() === 'asc' ? 1 : -1;
        const sortOptions = { [sortBy]: sortDirection };

        const [reports, total] = await Promise.all([
          Report.find(filter)
            .populate('analysisId')
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .lean(),
          Report.countDocuments(filter),
        ]);

        return {
          reports,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        };
      } catch (err) {
        console.warn('[ReportService] MongoDB read failed, falling back to memory store:', err.message);
      }
    }

    // In-memory fallback querying
    let allReports = Array.from(this.memoryReports.values()).filter(
      (r) => String(r.userId) === String(userId)
    );

    if (decision) {
      allReports = allReports.filter((r) => r.decision === decision.toUpperCase());
    }
    if (riskCategory || riskLevel) {
      allReports = allReports.filter((r) => r.riskCategory === (riskCategory || riskLevel).toLowerCase());
    }
    if (analysisType) {
      allReports = allReports.filter((r) => r.analysisType === analysisType.toLowerCase());
    }
    if (modelVersion) {
      allReports = allReports.filter((r) => r.modelVersion === modelVersion);
    }
    if (startDate) {
      allReports = allReports.filter((r) => new Date(r.createdAt) >= new Date(startDate));
    }
    if (endDate) {
      allReports = allReports.filter((r) => new Date(r.createdAt) <= new Date(endDate));
    }

    const sortDirection = sortOrder.toLowerCase() === 'asc' ? 1 : -1;
    allReports.sort((a, b) => {
      const valA = a[sortBy] ?? a.createdAt;
      const valB = b[sortBy] ?? b.createdAt;
      if (valA < valB) return -1 * sortDirection;
      if (valA > valB) return 1 * sortDirection;
      return 0;
    });

    const total = allReports.length;
    const paginated = allReports.slice(skip, skip + limit);

    return {
      reports: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Retrieves single report by ID with ownership verification.
   */
  static async getReportById(reportId, userId) {
    let report = null;

    if (this.isDbActive()) {
      try {
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(reportId);
        const query = isObjectId ? { _id: reportId } : { reportId };
        report = await Report.findOne(query).populate('analysisId').lean();
      } catch (err) {
        console.warn('[ReportService] MongoDB find failed, querying memory:', err.message);
      }
    }

    if (!report) {
      report = this.memoryReports.get(reportId) || Array.from(this.memoryReports.values()).find((r) => r._id === reportId || r.reportId === reportId);
    }

    if (!report) {
      throw new AppError('Report record not found.', HTTP_STATUS.NOT_FOUND);
    }

    if (String(report.userId) !== String(userId)) {
      throw new AppError('Unauthorized access to report record.', HTTP_STATUS.FORBIDDEN);
    }

    return report;
  }

  /**
   * Formats report export data into JSON or CSV string.
   */
  static async exportReport(reportId, userId, format = 'json') {
    const report = await this.getReportById(reportId, userId);

    if (format.toLowerCase() === 'csv') {
      const headers = ['ReportID', 'Date', 'TargetEntity', 'Type', 'RiskScore', 'Decision', 'ExpectedLoss', 'ModelVersion', 'Summary'];
      const row = [
        `"${report.reportId || report._id}"`,
        `"${new Date(report.createdAt).toISOString()}"`,
        `"${(report.targetEntity || '').replace(/"/g, '""')}"`,
        `"${report.analysisType}"`,
        report.riskScore,
        `"${report.decision}"`,
        report.expectedLoss,
        `"${report.modelVersion}"`,
        `"${(report.summary || '').replace(/"/g, '""')}"`,
      ];
      return {
        contentType: 'text/csv',
        filename: `report-${report.reportId || report._id}.csv`,
        data: `${headers.join(',')}\n${row.join(',')}`,
      };
    }

    return {
      contentType: 'application/json',
      filename: `report-${report.reportId || report._id}.json`,
      data: JSON.stringify(report, null, 2),
    };
  }
}

module.exports = ReportService;
