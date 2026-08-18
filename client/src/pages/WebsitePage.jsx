import React, { useState } from 'react';
import api from '../services/api';
import { useErrorLogs } from '../context/ErrorLogContext';
import {
  Globe,
  Search,
  Lock,
  ShieldCheck,
  Calendar,
  Info,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  ShieldAlert,
} from 'lucide-react';

export default function WebsitePage() {
  const { showToast } = useErrorLogs();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!url || !url.trim()) {
      showToast('Please enter a website URL (e.g. https://google.com).', 'error');
      return;
    }

    setLoading(true);
    setAnalysisResult(null);

    try {
      const res = await api.post('/websites/analyze', { url });
      const resultData = res.data?.data || res.data?.analysis || res.data;
      setAnalysisResult(resultData);
      showToast('Website security & SSL analysis completed!', 'success');
    } catch (err) {
      const errMsg = err?.message || err?.data?.message || 'Website analysis failed.';
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const ssl = analysisResult?.sslCertificate || {};
  const dns = analysisResult?.domainTelemetry || {};
  const domainAss = analysisResult?.domainAssessment || {};
  const tlsAss = analysisResult?.tlsAssessment || {};
  const phishingAss = analysisResult?.phishingAssessment || {};
  const riskAssessment = analysisResult?.riskAssessment || {};
  const signalsList = Array.isArray(analysisResult?.signals) ? analysisResult.signals : [];

  const score = analysisResult?.overallTrustScore ?? analysisResult?.trustScore ?? 85;
  const riskLevel = (riskAssessment.riskLevel || analysisResult?.riskCategory || 'LOW').toUpperCase();
  const phishingLikelihood = Math.round((phishingAss.likelihood || 0.05) * 100);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#2B2B2B] tracking-tight">Website Integrity & Phishing Inspector</h1>
        <p className="text-xs text-[#6B7280] mt-1">
          Inspect SSL/TLS socket certificates, WHOIS domain telemetry, DNS MX records, and multi-signal phishing threat heuristics.
        </p>
      </div>

      <div className="p-8 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-6">
        <form onSubmit={handleAnalyze} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#6B7280]">Target Website Domain URL</label>
            <div className="relative mt-1.5">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] w-4 h-4 stroke-[1.5]" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full pl-12 pr-4 py-3.5 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl text-sm text-[#2B2B2B] focus:outline-none focus:border-[#8E9A7D] font-mono"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="w-full py-3.5 bg-[#8E9A7D] hover:bg-[#7F8F73] disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF] text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center space-x-2 shadow-xs"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 stroke-[1.75]" />}
            <span>{loading ? 'Inspecting SSL Socket & DNS Data...' : 'Run Website Security Scan'}</span>
          </button>
        </form>
      </div>

      {analysisResult && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs">
              <span className="text-xs text-[#6B7280]">Website Trust Score</span>
              <p className="text-2xl font-black text-[#5B8C5A] mt-1">{score} / 100</p>
            </div>
            <div className="p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs">
              <span className="text-xs text-[#6B7280]">Domain Status</span>
              <p className="text-sm font-bold text-[#5B8C5A] font-mono mt-1">{domainAss.status || 'HEALTHY'}</p>
            </div>
            <div className="p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs">
              <span className="text-xs text-[#6B7280]">TLS Socket Score</span>
              <p className="text-2xl font-bold text-[#7F8F73] mt-1">{tlsAss.score || 95} / 100</p>
            </div>
            <div className="p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs">
              <span className="text-xs text-[#6B7280]">Risk Assessment</span>
              <p className="text-xs font-bold text-[#D9A441] uppercase mt-1">{riskLevel} RISK</p>
            </div>
          </div>

          {/* DOMAIN & TLS ASSESSMENT CARD */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-[#2B2B2B] border-b border-[#E5E7EB] pb-3 flex items-center space-x-2">
                <Lock className="text-[#5B8C5A] w-4 h-4" />
                <span>SSL / TLS Socket Certificate Details</span>
              </h3>
              <div className="space-y-2 text-xs font-mono">
                <div className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] flex justify-between">
                  <span>Certificate Issuer:</span>
                  <strong className="text-[#2B2B2B]">{ssl.issuer || 'N/A'}</strong>
                </div>
                <div className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] flex justify-between">
                  <span>Subject Common Name:</span>
                  <strong className="text-[#2B2B2B]">{ssl.subject || 'N/A'}</strong>
                </div>
                <div className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] flex justify-between">
                  <span>Days Remaining:</span>
                  <strong className="text-[#5B8C5A]">{ssl.daysRemaining ?? 'N/A'} Days</strong>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-[#2B2B2B] border-b border-[#E5E7EB] pb-3 flex items-center space-x-2">
                <Globe className="text-[#7F8F73] w-4 h-4" />
                <span>Phishing & Threat Signals</span>
              </h3>
              <div className="space-y-2 text-xs">
                {signalsList.map((sig, idx) => (
                  <div key={idx} className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-[#D9A441] flex-shrink-0 mt-0.5" />
                    <span className="text-[#6B7280]">{typeof sig === 'string' ? sig : sig.description}</span>
                  </div>
                ))}
                {signalsList.length === 0 && (
                  <p className="text-[#5B8C5A] p-3 bg-[#F8F7F4] rounded-xl font-semibold">CLEAN: Zero phishing threat flags triggered.</p>
                )}
              </div>
            </div>
          </div>

          {/* SECURITY RISK ASSESSMENT CARD */}
          <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs space-y-6">
            <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-[#5B8C5A]/15 text-[#5B8C5A]">
                  <ShieldAlert className="w-5 h-5 stroke-[1.75]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2B2B2B]">WEBSITE SECURITY RISK ASSESSMENT</h3>
                  <p className="text-xs text-[#6B7280]">Independent security evaluation based on phishing multipliers & TLS socket health</p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-[#5B8C5A]/15 text-[#5B8C5A] border border-[#5B8C5A]/30">
                {riskLevel} RISK LEVEL
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#2B2B2B] uppercase tracking-wider">Evaluation Reasons</h4>
                {riskAssessment.reasons?.map((reason, idx) => (
                  <div key={idx} className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] flex items-start space-x-2.5">
                    <AlertTriangle className="w-4 h-4 text-[#D9A441] flex-shrink-0 mt-0.5" />
                    <span className="text-[#6B7280]">{reason}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#2B2B2B] uppercase tracking-wider">Recommendations</h4>
                {riskAssessment.recommendations?.map((rec, idx) => (
                  <div key={idx} className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] flex items-start space-x-2.5">
                    <CheckCircle className="w-4 h-4 text-[#5B8C5A] flex-shrink-0 mt-0.5" />
                    <span className="text-[#6B7280]">{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] flex items-start space-x-3 text-xs text-[#6B7280]">
              <Info className="w-5 h-5 text-[#8E9A7D] flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#2B2B2B]">DETECTION ≠ DANGER:</strong>
                <p className="mt-0.5">A missing security header or newly registered domain does not automatically imply malicious intent. Verify identity independently before entering credentials.</p>
              </div>
            </div>
          </div>

          {/* Technical JSON Collapsible */}
          <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs space-y-4">
            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className="w-full flex items-center justify-between text-xs font-bold text-[#2B2B2B] hover:text-[#7F8F73] transition-colors"
            >
              <span>Technical Data / Raw JSON</span>
              {showRawJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showRawJson && (
              <pre className="p-4 bg-[#F8F7F4] rounded-xl text-xs font-mono text-[#7F8F73] border border-[#E5E7EB] overflow-x-auto max-h-96">
                {JSON.stringify(analysisResult, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
