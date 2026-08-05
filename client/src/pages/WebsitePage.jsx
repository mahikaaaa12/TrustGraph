import React, { useState } from 'react';
import api from '../services/api';
import { useErrorLogs } from '../context/ErrorLogContext';
import { FaGlobe, FaSearch, FaLock, FaShieldAlt, FaCalendarAlt, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

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
        <h1 className="text-2xl font-bold text-white tracking-tight">Website Security & SSL Inspector</h1>
        <p className="text-sm text-slate-400 mt-1">
          Inspect SSL/TLS certificate chains, WHOIS domain registration telemetry, phishing heuristics, and threat blacklists.
        </p>
      </div>

      {/* URL Scanner Input Form */}
      <div className="p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
        <form onSubmit={handleAnalyze} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400">Target Website Domain URL</label>
            <div className="relative mt-1.5">
              <FaGlobe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20"
          >
            <FaSearch />
            <span>{loading ? 'Inspecting SSL Socket & WHOIS Data...' : 'Run Website Security Scan'}</span>
          </button>
        </form>
      </div>

      {/* Analysis Results View */}
      {analysisResult && (
        <div className="space-y-8">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400">Website Trust Score</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                {analysisResult.websiteTrustScore} / 100
              </p>
            </div>
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400">SSL Certificate</span>
              <p className="text-lg font-bold text-emerald-400 mt-1 flex items-center space-x-1.5">
                <FaLock />
                <span>{analysisResult.sslDetails?.isValid ? 'Valid & Encrypted' : 'Invalid / Expired'}</span>
              </p>
            </div>
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400">Domain Age</span>
              <p className="text-lg font-bold text-blue-400 mt-1 flex items-center space-x-1.5">
                <FaCalendarAlt />
                <span>{analysisResult.whoisData?.domainAgeYears || 2} Years Old</span>
              </p>
            </div>
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400">Phishing Risk Index</span>
              <p className="text-sm font-bold text-amber-400 uppercase mt-1">
                {analysisResult.phishingRisk?.riskLevel || 'Low'} Risk
              </p>
            </div>
          </div>

          {/* Detailed SSL & Blacklist Telemetry */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SSL Certificate Details */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center space-x-2">
                <FaLock className="text-emerald-400" />
                <span>SSL / TLS Socket Inspection</span>
              </h3>
              <pre className="p-4 bg-slate-950 rounded-xl text-xs font-mono text-emerald-300 border border-slate-800 overflow-x-auto">
                {JSON.stringify(analysisResult.sslDetails, null, 2)}
              </pre>
            </div>

            {/* WHOIS & Blacklist Threat Status */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center space-x-2">
                <FaShieldAlt className="text-blue-400" />
                <span>Threat Blacklists & WHOIS</span>
              </h3>
              <pre className="p-4 bg-slate-950 rounded-xl text-xs font-mono text-blue-300 border border-slate-800 overflow-x-auto">
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
