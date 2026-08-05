import React from 'react';
import { Printer, Shield, CheckCircle } from 'lucide-react';

export default function ReportsPage() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2B2B2B] tracking-tight">Executive Trust & Security Report</h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Generate enterprise PDF reports summarizing multi-modal trust scores, security compliance, and threat mitigation strategy.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-[#8E9A7D] hover:bg-[#7F8F73] text-white text-xs font-semibold rounded-xl transition-colors flex items-center space-x-2 shadow-xs"
          >
            <Printer className="w-4 h-4 stroke-[1.75]" />
            <span>Print / Export PDF</span>
          </button>
        </div>
      </div>

      <div className="p-8 md:p-12 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-8 text-[#2B2B2B]">
        <div className="flex justify-between items-start border-b border-[#E5E7EB] pb-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-[#7F8F73] font-bold text-xl">
              <Shield className="w-6 h-6 stroke-[1.75]" />
              <span>TrustGraph Enterprise Audit</span>
            </div>
            <p className="text-xs text-[#6B7280]">Document Security & Digital Trust Evaluation Report</p>
          </div>
          <div className="text-right text-xs font-mono text-[#6B7280] space-y-1">
            <p>Report ID: <strong className="text-[#2B2B2B]">TG-RPT-2026-0805</strong></p>
            <p>Generated: <strong>August 5, 2026</strong></p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1">
            <span className="text-xs text-[#6B7280]">Composite Trust Index</span>
            <p className="text-3xl font-black text-[#5B8C5A]">88.4 / 100</p>
          </div>
          <div className="p-5 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1">
            <span className="text-xs text-[#6B7280]">Security Risk Profile</span>
            <p className="text-base font-bold text-[#5B8C5A]">LOW THREAT LEVEL</p>
          </div>
          <div className="p-5 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1">
            <span className="text-xs text-[#6B7280]">Evaluated Artifacts</span>
            <p className="text-base font-bold text-[#2B2B2B]">4 Modality Vector Channels</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-[#2B2B2B] border-b border-[#E5E7EB] pb-2">
            Strategic Security & Compliance Finding
          </h3>
          <div className="space-y-3 text-xs text-[#6B7280]">
            <div className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] flex items-start space-x-3">
              <CheckCircle className="text-[#5B8C5A] w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#2B2B2B]">Document PII Integrity: CLEAN</strong>
                <p className="text-[#6B7280] mt-0.5">Zero unencrypted Social Security Numbers or Credit Card tokens exposed.</p>
              </div>
            </div>
            <div className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] flex items-start space-x-3">
              <CheckCircle className="text-[#5B8C5A] w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#2B2B2B]">Website Domain Security: VERIFIED</strong>
                <p className="text-[#6B7280] mt-0.5">TLS 1.3 socket encryption verified with valid SAN SSL certificate.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
