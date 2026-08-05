import React, { useState } from 'react';
import api from '../services/api';
import { useErrorLogs } from '../context/ErrorLogContext';
import { Globe, Search, Lock, ShieldCheck, Calendar } from 'lucide-react';

export default function WebsitePage() {
  const { showToast } = useErrorLogs();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!url || !url.trim()) {
      showToast('Please enter a website URL (e.g. https://google.com).', 'error');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/websites/analyze', { url });
      setAnalysisResult(res.data?.data);
      showToast('Website security & SSL analysis completed!', 'success');
    } catch (err) {
      showToast(err.message || 'Website analysis failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#2B2B2B] tracking-tight">Website Security & SSL Inspector</h1>
        <p className="text-xs text-[#6B7280] mt-1">
          Inspect SSL/TLS certificate chains, WHOIS domain registration telemetry, phishing heuristics, and threat blacklists.
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
            <Search className="w-4 h-4 stroke-[1.75]" />
            <span>{loading ? 'Inspecting SSL Socket & WHOIS Data...' : 'Run Website Security Scan'}</span>
          </button>
        </form>
      </div>

      {analysisResult && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs">
              <span className="text-xs text-[#6B7280]">Website Trust Score</span>
              <p className="text-2xl font-black text-[#5B8C5A] mt-1">
                {analysisResult.websiteTrustScore} / 100
              </p>
            </div>
            <div className="p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs">
              <span className="text-xs text-[#6B7280]">SSL Certificate</span>
              <p className="text-sm font-bold text-[#5B8C5A] mt-1 flex items-center space-x-1.5">
                <Lock className="w-4 h-4" />
                <span>{analysisResult.sslDetails?.isValid ? 'Valid & Encrypted' : 'Invalid / Expired'}</span>
              </p>
            </div>
            <div className="p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs">
              <span className="text-xs text-[#6B7280]">Domain Age</span>
              <p className="text-sm font-bold text-[#7F8F73] mt-1 flex items-center space-x-1.5">
                <Calendar className="w-4 h-4" />
                <span>{analysisResult.whoisData?.domainAgeYears || 2} Years Old</span>
              </p>
            </div>
            <div className="p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs">
              <span className="text-xs text-[#6B7280]">Phishing Risk Index</span>
              <p className="text-xs font-bold text-[#D9A441] uppercase mt-1">
                {analysisResult.phishingRisk?.riskLevel || 'Low'} Risk
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-[#2B2B2B] border-b border-[#E5E7EB] pb-3 flex items-center space-x-2">
                <Lock className="text-[#5B8C5A] w-4 h-4" />
                <span>SSL / TLS Socket Inspection</span>
              </h3>
              <pre className="p-4 bg-[#F8F7F4] rounded-xl text-xs font-mono text-[#5B8C5A] border border-[#E5E7EB] overflow-x-auto">
                {JSON.stringify(analysisResult.sslDetails, null, 2)}
              </pre>
            </div>

            <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-[#2B2B2B] border-b border-[#E5E7EB] pb-3 flex items-center space-x-2">
                <ShieldCheck className="text-[#7F8F73] w-4 h-4" />
                <span>Threat Blacklists & WHOIS</span>
              </h3>
              <pre className="p-4 bg-[#F8F7F4] rounded-xl text-xs font-mono text-[#7F8F73] border border-[#E5E7EB] overflow-x-auto">
                {JSON.stringify(
                  {
                    whoisData: analysisResult.whoisData,
                    blacklists: analysisResult.threatBlacklists,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
