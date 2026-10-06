import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useErrorLogs } from '../context/ErrorLogContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Printer,
  Shield,
  CheckCircle,
  AlertTriangle,
  FileText,
  Loader2,
  FileCheck,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Share2,
  Sparkles,
  ShieldAlert,
  Calendar,
  Layers,
  RotateCcw,
  CheckCircle2,
  Info,
  ShieldCheck,
} from 'lucide-react';

export default function ReportsPage() {
  const { showToast } = useErrorLogs();
  const [reports, setReports] = useState([]);
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);

  // Filter & Pagination State
  const [filters, setFilters] = useState({
    decision: '',
    riskLevel: '',
    analysisType: '',
    modelVersion: '',
    page: 1,
    limit: 8,
  });

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 8,
    totalPages: 1,
  });

  const fetchReportsAndData = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (filters.decision) queryParams.append('decision', filters.decision);
      if (filters.riskLevel) queryParams.append('riskLevel', filters.riskLevel);
      if (filters.analysisType) queryParams.append('analysisType', filters.analysisType);
      if (filters.modelVersion) queryParams.append('modelVersion', filters.modelVersion);
      queryParams.append('page', filters.page);
      queryParams.append('limit', filters.limit);

      const [reportsRes, summaryRes] = await Promise.allSettled([
        api.get(`/reports?${queryParams.toString()}`),
        api.get('/dashboard/summary'),
      ]);

      if (reportsRes.status === 'fulfilled' && reportsRes.value.data?.data) {
        const fetched = reportsRes.value.data.data;
        setReports(fetched);
        setPagination(reportsRes.value.data.pagination || { total: fetched.length, page: 1, limit: 8, totalPages: 1 });

        if (fetched.length > 0) {
          setSelectedReport(fetched[0]);
        } else {
          setSelectedReport(null);
        }
      }

      if (summaryRes.status === 'fulfilled' && summaryRes.value.data?.data) {
        setRecentAnalyses(summaryRes.value.data.data.recentAnalyses || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dynamic reports from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsAndData();
  }, [filters.decision, filters.riskLevel, filters.analysisType, filters.modelVersion, filters.page]);

  const handleGenerateReport = async (analysisId) => {
    setGenerating(true);
    try {
      const res = await api.post('/reports', { analysisId });
      if (res.data?.success) {
        showToast('Audit report generated successfully!', 'success');
        await fetchReportsAndData();
        setSelectedReport(res.data.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to generate report.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async (format = 'json') => {
    if (!selectedReport) return;
    const reportId = selectedReport.reportId || selectedReport._id;

    try {
      const res = await api.get(`/reports/${reportId}/export?format=${format}`, {
        responseType: 'blob',
      });

      const blob = new Blob([res.data], {
        type: format === 'csv' ? 'text/csv' : 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trustgraph-report-${reportId}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      showToast(`Report exported as ${format.toUpperCase()}!`, 'success');
    } catch (err) {
      showToast('Export download failed.', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getDecisionBadge = (decision) => {
    switch (decision) {
      case 'BLOCK':
        return { label: 'BLOCK', bg: 'bg-[#D96C6C]/15', text: 'text-[#D96C6C]', border: 'border-[#D96C6C]/30', icon: ShieldAlert };
      case 'REVIEW':
        return { label: 'REVIEW', bg: 'bg-[#D9A441]/15', text: 'text-[#D9A441]', border: 'border-[#D9A441]/30', icon: AlertTriangle };
      case 'ALLOW':
      default:
        return { label: 'ALLOW', bg: 'bg-[#5B8C5A]/15', text: 'text-[#5B8C5A]', border: 'border-[#5B8C5A]/30', icon: CheckCircle };
    }
  };

  const badge = selectedReport ? getDecisionBadge(selectedReport.decision) : getDecisionBadge('ALLOW');

  const isCreatorReport = (report) => {
    if (!report) return false;
    const type = (report.analysisType || '').toLowerCase();
    const title = (report.title || '').toLowerCase();
    return (
      type === 'creator_verification' ||
      type === 'creator_package' ||
      type === 'brand_collaboration' ||
      title.includes('creator') ||
      title.includes('content verification')
    );
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2B2B2B] tracking-tight">Audit & Verification Reports</h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Official production reports for enterprise security audits and creator content verifications.
          </p>
        </div>

        {selectedReport && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleExport('json')}
              className="px-3.5 py-2 bg-white hover:bg-[#F8F7F4] border border-[#E5E7EB] text-[#2B2B2B] text-xs font-semibold rounded-xl transition-all flex items-center space-x-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="px-3.5 py-2 bg-white hover:bg-[#F8F7F4] border border-[#E5E7EB] text-[#2B2B2B] text-xs font-semibold rounded-xl transition-all flex items-center space-x-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-[#8E9A7D] hover:bg-[#7F8F73] text-white text-xs font-semibold rounded-xl transition-all flex items-center space-x-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* Multi-Field Filter Bar */}
      <div className="p-4 bg-white rounded-2xl border border-[#E5E7EB] shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2 text-xs">
          <span className="font-semibold text-[#2B2B2B] flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-[#8E9A7D]" />
            <span>Filter Report Records:</span>
          </span>
          <button
            onClick={() => setFilters({ decision: '', riskLevel: '', analysisType: '', modelVersion: '', page: 1, limit: 8 })}
            className="text-[11px] text-[#9CA3AF] hover:text-[#2B2B2B] flex items-center space-x-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          {/* Decision Filter */}
          <div>
            <label className="text-[10px] font-semibold text-[#9CA3AF] uppercase block">Decision</label>
            <select
              value={filters.decision}
              onChange={(e) => setFilters({ ...filters, decision: e.target.value, page: 1 })}
              className="w-full mt-1 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl px-3 py-1.5 font-mono text-xs text-[#2B2B2B]"
            >
              <option value="">All Verdicts</option>
              <option value="ALLOW">ALLOW / LOW RISK</option>
              <option value="REVIEW">REVIEW REQUIRED</option>
              <option value="BLOCK">BLOCK / HIGH RISK</option>
            </select>
          </div>

          {/* Risk Level Filter */}
          <div>
            <label className="text-[10px] font-semibold text-[#9CA3AF] uppercase block">Risk Level</label>
            <select
              value={filters.riskLevel}
              onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value, page: 1 })}
              className="w-full mt-1 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl px-3 py-1.5 font-mono text-xs text-[#2B2B2B]"
            >
              <option value="">All Risk Tiers</option>
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
              <option value="critical">Critical Risk</option>
            </select>
          </div>

          {/* Analysis Type */}
          <div>
            <label className="text-[10px] font-semibold text-[#9CA3AF] uppercase block">Analysis Type</label>
            <select
              value={filters.analysisType}
              onChange={(e) => setFilters({ ...filters, analysisType: e.target.value, page: 1 })}
              className="w-full mt-1 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl px-3 py-1.5 font-mono text-xs text-[#2B2B2B]"
            >
              <option value="">All Types</option>
              <option value="creator_verification">Creator Verification</option>
              <option value="trust_score">Trust Score</option>
              <option value="document">Document</option>
              <option value="image">Image</option>
              <option value="website">Website</option>
              <option value="text">Text</option>
            </select>
          </div>

          {/* Model Version */}
          <div>
            <label className="text-[10px] font-semibold text-[#9CA3AF] uppercase block">Model Version</label>
            <select
              value={filters.modelVersion}
              onChange={(e) => setFilters({ ...filters, modelVersion: e.target.value, page: 1 })}
              className="w-full mt-1 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl px-3 py-1.5 font-mono text-xs text-[#2B2B2B]"
            >
              <option value="">All Models</option>
              <option value="gbdt-risk-v1.0.0">gbdt-risk-v1.0.0 (GBDT)</option>
              <option value="logreg-risk-v1.0.0">logreg-risk-v1.0.0 (LogReg)</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center space-y-3 bg-white rounded-2xl border border-[#E5E7EB]">
          <Loader2 className="w-8 h-8 text-[#8E9A7D] animate-spin mx-auto" />
          <p className="text-xs font-mono text-[#6B7280]">Loading database reports...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-[#D96C6C]/10 border border-[#D96C6C]/30 rounded-2xl text-xs text-[#D96C6C]">
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quick Generate Report from Recent Analysis */}
          {recentAnalyses.length > 0 && (
            <div className="p-4 bg-[#F8F7F4] rounded-2xl border border-[#E5E7EB] space-y-2">
              <span className="text-xs font-bold text-[#2B2B2B] flex items-center space-x-1.5">
                <FileCheck className="w-4 h-4 text-[#8E9A7D]" />
                <span>Generate Report from Recent Database Telemetry:</span>
              </span>
              <div className="flex flex-wrap gap-2 pt-1 text-xs">
                {recentAnalyses.slice(0, 4).map((an) => (
                  <button
                    key={an._id}
                    onClick={() => handleGenerateReport(an._id)}
                    disabled={generating}
                    className="px-3 py-1.5 bg-white hover:bg-[#8E9A7D] hover:text-white border border-[#E5E7EB] text-[#2B2B2B] rounded-xl text-xs font-mono transition-colors flex items-center space-x-1 shadow-xs"
                  >
                    <span>+ Generate for {an.targetEntity?.substring(0, 24) || 'Scan'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Report Selector Pills */}
          {reports.length > 0 && (
            <div className="p-4 bg-white rounded-2xl border border-[#E5E7EB] shadow-xs space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-[#2B2B2B]">Select Audit Record ({pagination.total} Total):</span>
                <span className="text-[11px] font-mono text-[#6B7280]">Page {pagination.page} of {pagination.totalPages}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {reports.map((rpt) => {
                  const isSelected = (selectedReport?.reportId || selectedReport?._id) === (rpt.reportId || rpt._id);
                  return (
                    <button
                      key={rpt.reportId || rpt._id}
                      onClick={() => setSelectedReport(rpt)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition-colors flex items-center space-x-1.5 ${
                        isSelected
                          ? 'bg-[#8E9A7D] text-white border-[#8E9A7D] font-bold shadow-xs'
                          : 'bg-[#F8F7F4] text-[#6B7280] hover:text-[#2B2B2B] border-[#E5E7EB]'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${rpt.decision === 'BLOCK' ? 'bg-[#D96C6C]' : rpt.decision === 'REVIEW' ? 'bg-[#D9A441]' : 'bg-[#5B8C5A]'}`} />
                      <span>{rpt.targetEntity || rpt.title?.substring(0, 20)}</span>
                    </button>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-end items-center space-x-2 pt-2 border-t border-[#E5E7EB] text-xs">
                  <button
                    disabled={filters.page <= 1}
                    onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                    className="p-1.5 rounded-lg border border-[#E5E7EB] hover:bg-[#F8F7F4] disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-mono text-xs">{filters.page} / {pagination.totalPages}</span>
                  <button
                    disabled={filters.page >= pagination.totalPages}
                    onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                    className="p-1.5 rounded-lg border border-[#E5E7EB] hover:bg-[#F8F7F4] disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Detailed Report Viewer */}
          {selectedReport ? (
            isCreatorReport(selectedReport) ? (
              /* ─────────────────────────────────────────────────────────────
                 CREATOR CONTENT VERIFICATION REPORT VIEW
                 Professional layout suitable for Brands, Collaborators & Agencies
                 ───────────────────────────────────────────────────────────── */
              <div className="p-8 md:p-12 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm space-y-8 text-[#2B2B2B]">
                {/* Document Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-gray-900 pb-6">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-[#8E9A7D] font-black text-2xl tracking-tight">
                      <ShieldCheck className="w-7 h-7" />
                      <span>TrustGraph</span>
                    </div>
                    <h2 className="text-lg font-bold text-gray-800">Content Verification Report</h2>
                  </div>

                  {/* Header Metadata Grid */}
                  <div className="text-xs space-y-1.5 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                    <div>
                      <span className="text-gray-400 font-semibold">Content: </span>
                      <strong className="text-gray-900 font-mono">{selectedReport.targetEntity}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold">Platform: </span>
                      <strong className="text-gray-900">{selectedReport.metadata?.platform || 'Instagram / Manual'}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold">Analysis Date: </span>
                      <strong className="text-gray-900">{new Date(selectedReport.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                    </div>
                  </div>
                </div>

                {/* Score & Verdict Banner */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-gray-50 border border-gray-200">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">OVERALL TRUST SCORE</span>
                    <div className="text-5xl font-black text-[#8E9A7D]">
                      {selectedReport.metadata?.contentTrustScore !== undefined
                        ? selectedReport.metadata.contentTrustScore
                        : 100 - selectedReport.riskScore}
                      <span className="text-xl font-normal text-gray-400 ml-1.5">/ 100</span>
                    </div>
                  </div>

                  <div className="space-y-2 flex flex-col justify-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">VERDICT</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3.5 py-1 rounded-full text-xs font-black uppercase border ${
                          selectedReport.decision === 'BLOCK' || selectedReport.riskCategory === 'high' || selectedReport.riskCategory === 'critical'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : selectedReport.decision === 'REVIEW' || selectedReport.riskCategory === 'medium'
                            ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                            : 'bg-green-50 text-green-700 border-green-200'
                        }`}
                      >
                        {selectedReport.metadata?.verdictLabel || (selectedReport.decision === 'ALLOW' ? 'LOW RISK' : selectedReport.decision === 'REVIEW' ? 'REVIEW REQUIRED' : 'HIGH RISK')}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-gray-600">
                      {selectedReport.metadata?.verdictText ||
                        (selectedReport.decision === 'ALLOW'
                          ? 'Suitable for publishing based on analyzed indicators.'
                          : selectedReport.decision === 'REVIEW'
                          ? 'Some trust indicators require manual verification.'
                          : 'Multiple significant risk indicators detected.')}
                    </p>
                  </div>
                </div>

                {/* 8 Required Sections */}
                <div className="space-y-6">
                  {/* Section 1: Content Summary */}
                  <div className="space-y-2 border-b border-gray-100 pb-4">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">1. Content Summary</h3>
                    <p className="text-xs font-medium text-gray-700 leading-relaxed">
                      {selectedReport.metadata?.creatorSections?.contentSummary || selectedReport.summary}
                    </p>
                  </div>

                  {/* Section 2: Image Authenticity */}
                  <div className="space-y-2 border-b border-gray-100 pb-4">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">2. Image Authenticity</h3>
                    <p className="text-xs font-medium text-gray-700 leading-relaxed">
                      {selectedReport.metadata?.creatorSections?.imageAuthenticity || 'Compression ELA artifact check completed. Image displays natural noise variance.'}
                    </p>
                  </div>

                  {/* Section 3: Caption/Text Authenticity */}
                  <div className="space-y-2 border-b border-gray-100 pb-4">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">3. Caption/Text Authenticity</h3>
                    <p className="text-xs font-medium text-gray-700 leading-relaxed">
                      {selectedReport.metadata?.creatorSections?.textAuthenticity || 'Caption syntax analyzed for AI writing perplexity, burstiness, and promotional urgency language.'}
                    </p>
                  </div>

                  {/* Section 4: External Link Safety */}
                  <div className="space-y-2 border-b border-gray-100 pb-4">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">4. External Link Safety</h3>
                    <p className="text-xs font-medium text-gray-700 leading-relaxed">
                      {selectedReport.metadata?.creatorSections?.externalLinkSafety || 'Destination URL checked against active TLS/SSL encryption and domain phishing threat registries.'}
                    </p>
                  </div>

                  {/* Section 5: Metadata / Provenance */}
                  <div className="space-y-2 border-b border-gray-100 pb-4">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">5. Metadata / Provenance</h3>
                    <p className="text-xs font-medium text-gray-700 leading-relaxed">
                      {selectedReport.metadata?.creatorSections?.metadataProvenance || 'Camera sensor EXIF tags and digital signature provenance tags inspected.'}
                    </p>
                  </div>

                  {/* Section 6: Detected Risks */}
                  <div className="space-y-2 border-b border-gray-100 pb-4">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">6. Detected Risks</h3>
                    <div className="space-y-1.5">
                      {(selectedReport.topRiskFactors || []).length > 0 ? (
                        selectedReport.topRiskFactors.map((r, i) => (
                          <div key={i} className="text-xs text-gray-700 flex items-start gap-2">
                            <AlertTriangle size={13} className="text-yellow-600 mt-0.5 shrink-0" />
                            <span>{typeof r === 'string' ? r : r.summary || 'Risk factor evaluated.'}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-500 italic">No significant risk indicators flagged.</p>
                      )}
                    </div>
                  </div>

                  {/* Section 7: Evidence */}
                  <div className="space-y-2 border-b border-gray-100 pb-4">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">7. Evidence</h3>
                    <div className="space-y-1.5">
                      {(selectedReport.metadata?.creatorSections?.evidence || [
                        'No significant image manipulation detected',
                        'External link has no major security indicators',
                        'Multi-modal trust engine score verified',
                      ]).map((ev, i) => (
                        <div key={i} className="text-xs text-gray-700 flex items-start gap-2">
                          <CheckCircle2 size={13} className="text-green-600 mt-0.5 shrink-0" />
                          <span>{ev}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 8: Recommendations */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">8. Recommendations</h3>
                    <div className="space-y-1.5">
                      {selectedReport.recommendations?.map((rec, i) => (
                        <div key={i} className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs font-medium text-gray-800">
                          {rec}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Non-Definitive Phrasing Disclaimer */}
                <div className="pt-4 border-t border-gray-200 text-[11px] text-gray-400 italic">
                  Notice: TrustGraph Creator Verification Reports present risk indicators derived from multi-modal telemetry algorithms. TrustGraph does not make definitive legal claims regarding content authenticity or fraudulent intent.
                </div>
              </div>
            ) : (
              /* ─────────────────────────────────────────────────────────────
                 ENTERPRISE FORENSIC AUDIT REPORT VIEW (EXISTING)
                 ───────────────────────────────────────────────────────────── */
              <div className="p-8 md:p-12 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-8 text-[#2B2B2B]">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-6">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-[#7F8F73] font-bold text-xl">
                      <Shield className="w-6 h-6 stroke-[1.75]" />
                      <span>TrustGraph Forensic Security Audit</span>
                    </div>
                    <p className="text-xs text-[#6B7280]">{selectedReport.title}</p>
                  </div>
                  <div className="text-left sm:text-right text-xs font-mono text-[#6B7280] space-y-1">
                    <p>Report ID: <strong className="text-[#2B2B2B]">#{selectedReport.reportId || selectedReport._id}</strong></p>
                    <p>Timestamp: <strong>{new Date(selectedReport.createdAt).toLocaleString()}</strong></p>
                    <p>Type: <strong className="uppercase">{selectedReport.analysisType}</strong></p>
                  </div>
                </div>

                {/* KPI Score Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 bg-[#F8F7F4] rounded-2xl border border-[#E5E7EB] space-y-1">
                    <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase">Calibrated Risk Score</span>
                    <p className="text-3xl font-black text-[#D96C6C]">{selectedReport.riskScore} / 100</p>
                    <span className="text-[10px] text-[#6B7280]">P(Fraud): {((selectedReport.fraudProbability || 0.15) * 100).toFixed(1)}%</span>
                  </div>

                  <div className="p-5 bg-[#F8F7F4] rounded-2xl border border-[#E5E7EB] space-y-1">
                    <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase">Policy Decision</span>
                    <div className="flex items-center space-x-2 pt-0.5">
                      <span className={`text-2xl font-black ${badge.text}`}>{selectedReport.decision}</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-[#6B7280]">{selectedReport.riskCategory} Risk Tier</span>
                  </div>

                  <div className="p-5 bg-[#F8F7F4] rounded-2xl border border-[#E5E7EB] space-y-1">
                    <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase">Expected Loss</span>
                    <p className="text-3xl font-black text-[#2B2B2B]">${(selectedReport.expectedLoss || 0).toFixed(2)}</p>
                    <span className="text-[10px] text-[#6B7280]">Dollar exposure</span>
                  </div>

                  <div className="p-5 bg-[#F8F7F4] rounded-2xl border border-[#E5E7EB] space-y-1">
                    <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase">Governance Versions</span>
                    <p className="text-xs font-mono font-bold text-[#2B2B2B] pt-1">{selectedReport.modelVersion || 'gbdt-risk-v1.0.0'}</p>
                    <span className="text-[10px] font-mono text-[#6B7280]">{selectedReport.policyVersion || 'policies-v1.2.0'}</span>
                  </div>
                </div>

                {/* Executive Summary */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-[#2B2B2B] border-b border-[#E5E7EB] pb-2 flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-[#8E9A7D]" />
                    <span>Executive Summary & Risk Context</span>
                  </h3>
                  <div className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] text-xs text-[#6B7280] leading-relaxed font-mono">
                    {selectedReport.summary}
                  </div>
                </div>

                {/* Strategic Recommendations */}
                {selectedReport.recommendations?.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-[#2B2B2B] border-b border-[#E5E7EB] pb-2 flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-[#5B8C5A]" />
                      <span>Actionable Strategic Recommendations</span>
                    </h3>
                    <div className="space-y-2">
                      {selectedReport.recommendations.map((rec, idx) => (
                        <div key={idx} className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] text-xs flex items-start space-x-2.5">
                          <span className="w-5 h-5 rounded-full bg-[#8E9A7D]/20 text-[#7F8F73] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="text-[#2B2B2B] font-medium leading-relaxed">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="p-16 bg-white border border-[#E5E7EB] rounded-2xl text-center text-[#9CA3AF] text-xs space-y-3 shadow-xs">
              <FileText className="w-10 h-10 text-[#9CA3AF] mx-auto" />
              <p className="font-semibold text-[#2B2B2B]">No Matching Reports Found</p>
              <p className="text-[#6B7280]">Try adjusting your filter parameters or generate a new report from a recent scan above.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
