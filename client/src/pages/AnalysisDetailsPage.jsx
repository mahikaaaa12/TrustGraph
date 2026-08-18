import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import api from '../services/api';
import {
  ArrowLeft,
  Shield,
  Award,
  AlertTriangle,
  CheckCircle,
  FileText,
  Clock,
  Download,
  RotateCcw,
  Loader2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Lock,
  Globe,
  Tag,
} from 'lucide-react';
import TrustGraphVisualizer from '../components/TrustGraphVisualizer';

export default function AnalysisDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);

  useEffect(() => {
    const fetchAnalysisDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/history/${id}`);
        if (res.data?.success) {
          setAnalysis(res.data.data);
        }
      } catch (err) {
        setError(err.message || 'Failed to load analysis details.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysisDetail();
  }, [id]);

  const handleGenerateReport = async () => {
    if (!analysis) return;
    setReportGenerating(true);
    try {
      await api.post('/reports', { analysisId: analysis._id });
      navigate('/dashboard/reports');
    } catch (err) {
      alert(err.message || 'Report generation failed');
    } finally {
      setReportGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center space-y-3 max-w-4xl mx-auto bg-white rounded-2xl border border-[#E5E7EB] shadow-xs">
        <Loader2 className="w-8 h-8 text-[#8E9A7D] animate-spin mx-auto" />
        <p className="text-xs font-mono text-[#6B7280]">Fetching analysis record #{id}...</p>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <button
          onClick={() => navigate('/dashboard/history')}
          className="flex items-center space-x-2 text-xs text-[#7F8F73] font-semibold hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to History</span>
        </button>
        <div className="p-6 bg-[#D96C6C]/10 border border-[#D96C6C]/30 rounded-2xl text-xs text-[#D96C6C]">
          {error || 'Analysis record not found.'}
        </div>
      </div>
    );
  }

  const score = analysis.trustScore || 0;
  const confidence = (analysis.confidenceScore || 0.95) * 100;
  const risk = analysis.riskCategory || 'low';

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header & Navigation Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-6">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/dashboard/history')}
            className="flex items-center space-x-2 text-xs text-[#7F8F73] font-semibold hover:underline mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Audit History</span>
          </button>
          <h1 className="text-2xl font-extrabold text-[#2B2B2B] tracking-tight">
            Analysis Telemetry Record
          </h1>
          <p className="text-xs font-mono text-[#6B7280]">
            ID: <strong className="text-[#2B2B2B]">#{analysis._id}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleGenerateReport}
            disabled={reportGenerating}
            className="px-4 py-2.5 bg-[#8E9A7D] hover:bg-[#7F8F73] disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors flex items-center space-x-2 shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>{reportGenerating ? 'Generating...' : 'Download Executive Report'}</span>
          </button>
          <NavLink
            to={`/dashboard/${analysis.entityType === 'domain' ? 'website' : 'document'}`}
            className="px-4 py-2.5 bg-[#F8F7F4] hover:bg-[#F3F2EF] text-[#2B2B2B] border border-[#E5E7EB] text-xs font-semibold rounded-xl transition-colors flex items-center space-x-2"
          >
            <RotateCcw className="w-4 h-4 text-[#7F8F73]" />
            <span>Run Scan Again</span>
          </NavLink>
        </div>
      </div>

      {/* Top Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs space-y-2">
          <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase">Composite Trust Score</span>
          <p className="text-4xl font-black text-[#5B8C5A]">{score}%</p>
          <p className="text-[11px] text-[#6B7280]">Weighted multi-channel evaluation</p>
        </div>

        <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs space-y-2">
          <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase">Risk Profile</span>
          <div className="pt-1">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                risk === 'critical' || risk === 'high'
                  ? 'bg-[#D96C6C]/15 text-[#D96C6C] border-[#D96C6C]/30'
                  : risk === 'medium'
                  ? 'bg-[#D9A441]/15 text-[#D9A441] border-[#D9A441]/30'
                  : 'bg-[#5B8C5A]/15 text-[#5B8C5A] border-[#5B8C5A]/30'
              }`}
            >
              {risk} RISK
            </span>
          </div>
          <p className="text-[11px] text-[#6B7280] pt-1">Automated threat classification</p>
        </div>

        <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs space-y-2">
          <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase">Confidence Index</span>
          <p className="text-3xl font-black text-[#7F8F73]">{confidence.toFixed(0)}%</p>
          <p className="text-[11px] text-[#6B7280]">Variance & statistical consensus</p>
        </div>

        <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs space-y-2">
          <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase">Modality Channel</span>
          <p className="text-lg font-bold text-[#2B2B2B] capitalize font-mono">{analysis.entityType}</p>
          <p className="text-[11px] text-[#6B7280]">Target: {analysis.targetEntity.substring(0, 20)}</p>
        </div>
      </div>

      {/* Target Entity Metadata Card */}
      <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-[#2B2B2B] border-b border-[#E5E7EB] pb-3 flex items-center space-x-2">
          <Tag className="w-4 h-4 text-[#8E9A7D]" />
          <span>Analysis Metadata & Execution Provenance</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1">
            <span className="text-[#9CA3AF]">Target Entity Name</span>
            <p className="text-[#2B2B2B] font-semibold truncate">{analysis.targetEntity}</p>
          </div>
          <div className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1">
            <span className="text-[#9CA3AF]">Evaluation Status</span>
            <p className="text-[#5B8C5A] font-semibold capitalize">{analysis.status}</p>
          </div>
          <div className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1">
            <span className="text-[#9CA3AF]">Execution Timestamp</span>
            <p className="text-[#6B7280]">{new Date(analysis.createdAt).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Trust Graph Interactive Node Visualizer */}
      <TrustGraphVisualizer analysis={analysis} />

      {/* Positive & Negative Findings / Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#2B2B2B] border-b border-[#E5E7EB] pb-3 flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-[#5B8C5A]" />
            <span>Positive Trust Indicators</span>
          </h3>
          <ul className="space-y-2.5 text-xs text-[#6B7280]">
            {analysis.insights
              ?.filter((ins) => !ins.toUpperCase().includes('WARNING') && !ins.toUpperCase().includes('ALERT'))
              .map((ins, idx) => (
                <li key={idx} className="flex items-start space-x-2.5 p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB]">
                  <CheckCircle className="w-4 h-4 text-[#5B8C5A] flex-shrink-0 mt-0.5" />
                  <span>{ins}</span>
                </li>
              ))}
            {(!analysis.insights || analysis.insights.length === 0) && (
              <p className="text-[#9CA3AF] italic">No positive indicators logged.</p>
            )}
          </ul>
        </div>

        <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#2B2B2B] border-b border-[#E5E7EB] pb-3 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-[#D96C6C]" />
            <span>Threat Warnings & Anomalies</span>
          </h3>
          <ul className="space-y-2.5 text-xs text-[#6B7280]">
            {analysis.insights
              ?.filter((ins) => ins.toUpperCase().includes('WARNING') || ins.toUpperCase().includes('ALERT'))
              .map((ins, idx) => (
                <li key={idx} className="flex items-start space-x-2.5 p-3 bg-[#D96C6C]/10 rounded-xl border border-[#D96C6C]/30 text-[#D96C6C]">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{ins}</span>
                </li>
              ))}
            {(!analysis.insights?.some((ins) => ins.toUpperCase().includes('WARNING') || ins.toUpperCase().includes('ALERT'))) && (
              <p className="text-[#5B8C5A] text-xs font-semibold p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB]">
                CLEAN: Zero threat warnings or high-risk anomalies detected.
              </p>
            )}
          </ul>
        </div>
      </div>

      {/* Raw JSON Data Accordion */}
      <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs space-y-4">
        <button
          onClick={() => setShowRawJson(!showRawJson)}
          className="w-full flex items-center justify-between text-xs font-bold text-[#2B2B2B] hover:text-[#7F8F73] transition-colors"
        >
          <span>Raw Technical Telemetry Data (JSON)</span>
          {showRawJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showRawJson && (
          <pre className="p-4 bg-[#F8F7F4] rounded-xl text-xs font-mono text-[#7F8F73] border border-[#E5E7EB] overflow-x-auto max-h-96">
            {JSON.stringify(analysis, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
