const ReportService = require('../../src/services/report.service');
const { defaultRiskAudit } = require('../../src/services/riskAudit.service');

describe('Dynamic ReportService Unit Tests', () => {
  const testUserId = 'user_audit_test_999';
  const otherUserId = 'user_unauthorized_123';

  beforeEach(() => {
    ReportService.memoryReports.clear();
  });

  describe('1. Dynamic Report Creation', () => {
    it('should generate a dynamic report with calibrated risk score, policy decision, and versions', async () => {
      const report = await ReportService.createReport(testUserId, {
        title: 'Forensic Audit: Suspect Device Cluster',
        targetEntity: 'cust_sybil_001',
        analysisType: 'transaction',
        riskScore: 82.5,
        fraudProbability: 0.825,
        decision: 'BLOCK',
        riskCategory: 'critical',
        expectedLoss: 450.0,
        modelVersion: 'gbdt-risk-v1.0.0',
        policyVersion: 'policies-v1.2.0',
        recommendations: ['Immediate hold on payout accounts.'],
      });

      expect(report).toHaveProperty('reportId');
      expect(report.decision).toBe('BLOCK');
      expect(report.riskScore).toBe(82.5);
      expect(report.expectedLoss).toBe(450.0);
      expect(report.recommendations).toContain('Immediate hold on payout accounts.');

      // Check audit trail entry
      const logs = await defaultRiskAudit.getAuditLogs({ eventId: `audit_rpt_${report.reportId}` });
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('2. Filtering and Pagination', () => {
    beforeEach(async () => {
      // Seed 5 test reports with distinct attributes
      await ReportService.createReport(testUserId, {
        targetEntity: 'entity_allow_1',
        decision: 'ALLOW',
        riskCategory: 'low',
        analysisType: 'trust_score',
        riskScore: 10,
        modelVersion: 'gbdt-risk-v1.0.0',
      });
      await ReportService.createReport(testUserId, {
        targetEntity: 'entity_allow_2',
        decision: 'ALLOW',
        riskCategory: 'low',
        analysisType: 'website',
        riskScore: 15,
        modelVersion: 'gbdt-risk-v1.0.0',
      });
      await ReportService.createReport(testUserId, {
        targetEntity: 'entity_review_1',
        decision: 'REVIEW',
        riskCategory: 'medium',
        analysisType: 'document',
        riskScore: 55,
        modelVersion: 'gbdt-risk-v1.0.0',
      });
      await ReportService.createReport(testUserId, {
        targetEntity: 'entity_block_1',
        decision: 'BLOCK',
        riskCategory: 'critical',
        analysisType: 'image',
        riskScore: 90,
        modelVersion: 'logreg-risk-v1.0.0',
      });
      await ReportService.createReport(testUserId, {
        targetEntity: 'entity_block_2',
        decision: 'BLOCK',
        riskCategory: 'critical',
        analysisType: 'transaction',
        riskScore: 95,
        modelVersion: 'gbdt-risk-v1.0.0',
      });
    });

    it('should filter reports by decision', async () => {
      const result = await ReportService.getUserReports(testUserId, { decision: 'BLOCK' });
      expect(result.total).toBe(2);
      expect(result.reports.every((r) => r.decision === 'BLOCK')).toBe(true);
    });

    it('should filter reports by analysis type and model version', async () => {
      const result = await ReportService.getUserReports(testUserId, {
        analysisType: 'website',
        modelVersion: 'gbdt-risk-v1.0.0',
      });
      expect(result.total).toBe(1);
      expect(result.reports[0].targetEntity).toBe('entity_allow_2');
    });

    it('should correctly paginate results with page and limit', async () => {
      const page1 = await ReportService.getUserReports(testUserId, { page: 1, limit: 2 });
      expect(page1.reports.length).toBe(2);
      expect(page1.total).toBe(5);
      expect(page1.totalPages).toBe(3);

      const page2 = await ReportService.getUserReports(testUserId, { page: 2, limit: 2 });
      expect(page2.reports.length).toBe(2);
      expect(page2.page).toBe(2);
    });
  });

  describe('3. Single Report Retrieval & Security', () => {
    it('should retrieve single report for authorized user', async () => {
      const created = await ReportService.createReport(testUserId, {
        title: 'Single Report Test',
        targetEntity: 'single_test_entity',
      });

      const retrieved = await ReportService.getReportById(created.reportId, testUserId);
      expect(retrieved.title).toBe('Single Report Test');
    });

    it('should reject retrieval for non-owner user with 403 Forbidden', async () => {
      const created = await ReportService.createReport(testUserId, {
        title: 'Confidential Report',
      });

      await expect(ReportService.getReportById(created.reportId, otherUserId)).rejects.toThrow(
        /Unauthorized/
      );
    });

    it('should throw 404 for non-existent report ID', async () => {
      await expect(ReportService.getReportById('rpt_does_not_exist_404', testUserId)).rejects.toThrow(
        /not found/
      );
    });
  });

  describe('4. Report Export (JSON & CSV)', () => {
    it('should export report as formatted JSON string', async () => {
      const created = await ReportService.createReport(testUserId, {
        targetEntity: 'export_json_entity',
        riskScore: 70,
      });

      const exportRes = await ReportService.exportReport(created.reportId, testUserId, 'json');
      expect(exportRes.contentType).toBe('application/json');
      const parsed = JSON.parse(exportRes.data);
      expect(parsed.targetEntity).toBe('export_json_entity');
    });

    it('should export report as formatted CSV string with valid headers', async () => {
      const created = await ReportService.createReport(testUserId, {
        targetEntity: 'export_csv_entity',
        decision: 'REVIEW',
        riskScore: 60,
      });

      const exportRes = await ReportService.exportReport(created.reportId, testUserId, 'csv');
      expect(exportRes.contentType).toBe('text/csv');
      expect(exportRes.data).toContain('ReportID,Date,TargetEntity');
      expect(exportRes.data).toContain('export_csv_entity');
      expect(exportRes.data).toContain('REVIEW');
    });
  });
});
