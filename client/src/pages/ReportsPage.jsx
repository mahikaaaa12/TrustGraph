import React from 'react';
import { FaFileExport, FaDownload, FaPrint, FaShieldAlt, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

export default function ReportsPage() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Executive Trust & Security Report</h1>
          <p className="text-sm text-slate-400 mt-1">
            Generate enterprise PDF reports summarizing multi-modal trust scores, security compliance, and threat mitigation strategy.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors flex items-center space-x-2 shadow-lg shadow-blue-600/20"
          >
            <FaPrint />
            <span>Print / Export PDF</span>
          </button>
        </div>
      </div>

      {/* Report Document Preview Sheet */}
      <div className="p-8 md:p-12 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-8 text-slate-200">
        {/* Report Header */}
        <div className="flex justify-between items-start border-b border-slate-800 pb-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-blue-400 font-bold text-xl">
              <FaShieldAlt />
              <span>TrustGraph Enterprise Audit</span>
            </div>
            <p className="text-xs text-slate-400">Document Security & Digital Trust Evaluation Report</p>
          </div>
          <div className="text-right text-xs font-mono text-slate-400 space-y-1">
            <p>Report ID: <strong className="text-white">TG-RPT-2026-0805</strong></p>
            <p>Generated: <strong>August 5, 2026</strong></p>
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400">Composite Trust Index</span>
            <p className="text-3xl font-black text-emerald-400">88.4 / 100</p>
          </div>
          <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400">Security Risk Profile</span>
            <p className="text-lg font-bold text-emerald-400">LOW THREAT LEVEL</p>
          </div>
          <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400">Evaluated Artifacts</span>
            <p className="text-lg font-bold text-white">4 Modality Vector Channels</p>
          </div>
        </div>

        {/* Compliance Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
            Strategic Security & Compliance Finding
          </h3>
          <div className="space-y-3 text-xs text-slate-300">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start space-x-3">
              <FaCheckCircle className="text-emerald-400 text-base flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Document PII Integrity: CLEAN</strong>
                <p className="text-slate-400 mt-0.5">Zero unencrypted Social Security Numbers or Credit Card tokens exposed.</p>
              </div>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start space-x-3">
              <FaCheckCircle className="text-emerald-400 text-base flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Website Domain Security: VERIFIED</strong>
                <p className="text-slate-400 mt-0.5">TLS 1.3 socket encryption verified with valid SAN SSL certificate.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
