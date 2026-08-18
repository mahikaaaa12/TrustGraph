import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Printer, Shield, CheckCircle, AlertTriangle, FileText, Loader2, FileCheck } from 'lucide-react';

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);

  const fetchReportsAndData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [reportsRes, summaryRes] = await Promise.allSettled([
        api.get('/reports'),
        api.get('/dashboard/summary'),
      ]);

      if (reportsRes.status === 'fulfilled' && reportsRes.value.data?.data) {
        const fetched = reportsRes.value.data.data;
        setReports(fetched);
        if (fetched.length > 0) {
          setSelectedReport(fetched[0]);
        }
      }

      if (summaryRes.status === 'fulfilled' && summaryRes.value.data?.data) {
        setRecentAnalyses(summaryRes.value.data.data.recentAnalyses || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load executive reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsAndData();
  }, []);

  const handleGenerateReport = async (analysisId) => {
    setGenerating(true);
    try {
      const res = await api.post('/reports', { analysisId });
      if (res.data?.success) {
        await fetchReportsAndData();
        setSelectedReport(res.data.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate report.');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const currentAnalysis = selectedReport?.analysisId || null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2B2B2B] tracking-tight">Executive Trust & Security Reports</h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Generate enterprise audit reports summarizing multi-modal trust scores, security compliance, and threat mitigation strategy.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrint}
            disabled={!selectedReport}
            className="px-4 py-2.5 bg-[#8E9A7D] hover:bg-[#7F8F73] disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors flex items-center space-x-2 shadow-xs"
          >
            <Printer className="w-4 h-4 stroke-[1.75]" />
            <span>Print / Export PDF</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center space-y-3 bg-white rounded-2xl border border-[#E5E7EB]">
          <Loader2 className="w-8 h-8 text-[#8E9A7D] animate-spin mx-auto" />
          <p className="text-xs font-mono text-[#6B7280]">Loading MongoDB executive report records...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-[#D96C6C]/10 border border-[#D96C6C]/30 rounded-2xl text-xs text-[#D96C6C]">
          {error}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Report Selector or Generator */}
          {reports.length > 0 && (
            <div className="p-4 bg-white rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-[#2B2B2B]">Select Audit Report:</span>
              <div className="flex flex-wrap gap-2">
                {reports.map((rpt) => (
                  <button
                    key={rpt._id}
                    onClick={() => setSelectedReport(rpt)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition-colors ${
                      selectedReport?._id === rpt._id
                        ? 'bg-[#8E9A7D] text-white border-[#8E9A7D] font-bold'
                        : 'bg-[#F8F7F4] text-[#6B7280] hover:text-[#2B2B2B] border-[#E5E7EB]'
                    }`}
                  >
                    #{rpt._id.substring(rpt._id.length - 6)} - {rpt.metadata?.get ? rpt.metadata.get('targetEntity') : rpt.title.substring(0, 25)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Generate Report from Recent Analysis */}
          {recentAnalyses.length > 0 && (
            <div className="p-4 bg-[#F8F7F4] rounded-2xl border border-[#E5E7EB] space-y-2">
              <span className="text-xs font-bold text-[#2B2B2B] flex items-center space-x-1.5">
                <FileCheck className="w-4 h-4 text-[#8E9A7D]" />
                <span>Generate New Executive Report from Recent Analysis:</span>
              </span>
              <div className="flex flex-wrap gap-2 pt-1 text-xs">
                {recentAnalyses.slice(0, 4).map((an) => (
                  <button
                    key={an._id}
                    onClick={() => handleGenerateReport(an._id)}
                    disabled={generating}
                    className="px-3 py-1.5 bg-white hover:bg-[#8E9A7D] hover:text-white border border-[#E5E7EB] text-[#2B2B2B] rounded-xl text-xs font-mono transition-colors flex items-center space-x-1 shadow-xs"
                  >
                    <span>+ Generate for {an.targetEntity.substring(0, 25)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Report Viewer Card */}
          {selectedReport ? (
            <div className="p-8 md:p-12 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-8 text-[#2B2B2B]">
              <div className="flex justify-between items-start border-b border-[#E5E7EB] pb-6">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-[#7F8F73] font-bold text-xl">
                    <Shield className="w-6 h-6 stroke-[1.75]" />
                    <span>TrustGraph Enterprise Audit</span>
                  </div>
                  <p className="text-xs text-[#6B7280]">{selectedReport.title}</p>
                </div>
                <div className="text-right text-xs font-mono text-[#6B7280] space-y-1">
                  <p>Report ID: <strong className="text-[#2B2B2B]">#TG-{selectedReport._id.substring(selectedReport._id.length - 8)}</strong></p>
                  <p>Generated: <strong>{new Date(selectedReport.createdAt).toLocaleDateString()}</strong></p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1">
                  <span className="text-xs text-[#6B7280]">Composite Trust Index</span>
                  <p className="text-3xl font-black text-[#5B8C5A]">
                    {currentAnalysis?.trustScore ?? selectedReport.metadata?.get?.('trustScore') ?? '85.0'} / 100
                  </p>
                </div>
                <div className="p-5 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1">
                  <span className="text-xs text-[#6B7280]">Security Risk Profile</span>
                  <p className="text-base font-bold text-[#5B8C5A] uppercase">
                    {(currentAnalysis?.riskCategory || selectedReport.metadata?.get?.('riskCategory') || 'low')} RISK
                  </p>
                </div>
                <div className="p-5 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1">
                  <span className="text-xs text-[#6B7280]">Target Entity</span>
                  <p className="text-xs font-bold font-mono text-[#2B2B2B] truncate">
                    {currentAnalysis?.targetEntity || selectedReport.metadata?.get?.('targetEntity') || 'System Audit'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#2B2B2B] border-b border-[#E5E7EB] pb-2">
                  Executive Summary & Strategic Compliance Findings
                </h3>
                <div className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] text-xs text-[#6B7280] leading-relaxed">
                  {selectedReport.summary}
                </div>

                {currentAnalysis?.insights && currentAnalysis.insights.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-semibold text-[#2B2B2B]">Telemetry Insights:</h4>
                    <div className="space-y-2 text-xs">
                      {currentAnalysis.insights.map((ins, idx) => (
                        <div key={idx} className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] flex items-start space-x-3">
                          <CheckCircle className="text-[#5B8C5A] w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span className="text-[#6B7280]">{ins}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-16 bg-white border border-[#E5E7EB] rounded-2xl text-center text-[#9CA3AF] text-xs space-y-3 shadow-xs">
              <FileText className="w-10 h-10 text-[#9CA3AF] mx-auto" />
              <p className="font-semibold text-[#2B2B2B]">No Executive Reports Generated Yet</p>
              <p className="text-[#6B7280]">Run an analysis or select a recent scan above to generate a report!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
