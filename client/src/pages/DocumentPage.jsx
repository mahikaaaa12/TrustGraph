import React, { useState } from 'react';
import api from '../services/api';
import { useErrorLogs } from '../context/ErrorLogContext';
import { motion } from 'framer-motion';
import {
  UploadCloud,
  FileText,
  Search,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Key,
  ChevronDown,
  ChevronUp,
  Lock,
  Check,
  Loader2,
  Cpu,
  Info,
  ShieldAlert,
  FileCheck,
} from 'lucide-react';

export default function DocumentPage() {
  const { showToast } = useErrorLogs();
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [fileChecksum, setFileChecksum] = useState(null);
  const [fileSizeBytes, setFileSizeBytes] = useState(0);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const stepsList = [
    'File uploaded to server',
    'Metadata & page structure extracted',
    'Text content inspected',
    'PII & secret key regex scanners running',
    'AI-generation heuristics evaluated',
    'Document risk & trust score computed',
  ];

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setFileSizeBytes(e.target.files[0].size);
      setAnalysisResult(null);
      setFileChecksum(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setFileSizeBytes(e.dataTransfer.files[0].size);
      setAnalysisResult(null);
      setFileChecksum(null);
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast('Please select a PDF, DOCX, or TXT file to analyze.', 'error');
      return;
    }

    setLoading(true);
    setScanStep(1);
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      setScanStep(2);
      const uploadRes = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const fileObj = uploadRes.data?.data?.file;
      const fileId = fileObj?._id;
      if (!fileId) {
        throw new Error('File upload response missing fileId.');
      }

      if (fileObj?.checksum) {
        setFileChecksum(fileObj.checksum);
      }

      setScanStep(3);
      await new Promise((r) => setTimeout(r, 200));

      setScanStep(4);
      const analyzeRes = await api.post('/documents/analyze', { fileId });

      setScanStep(5);
      await new Promise((r) => setTimeout(r, 200));

      setScanStep(6);
      const resultData = analyzeRes.data?.data || analyzeRes.data?.analysis || analyzeRes.data;
      setAnalysisResult(resultData);
      showToast('Document security & AI generation analysis completed!', 'success');
    } catch (err) {
      const errMsg = err?.message || err?.data?.message || 'Document analysis failed.';
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const indicators = analysisResult?.trustIndicators || {};
  const sensitive = analysisResult?.sensitiveInfo || {};
  const metadata = analysisResult?.metadata || {};
  const aiAssessment = analysisResult?.aiGenerationAssessment || {};
  const riskAssessment = analysisResult?.riskAssessment || {};
  const findingsList = Array.isArray(analysisResult?.findings) ? analysisResult.findings : [];

  const score = indicators.trustScore ?? analysisResult?.overallTrustScore ?? analysisResult?.trustScore ?? 85;
  const riskLevel = (riskAssessment.riskLevel || indicators.riskCategory || 'LOW').toUpperCase();
  const pageCount = metadata.pageCount || 1;

  const aiLikelihood = Math.round((aiAssessment.likelihood || 0.05) * 100);
  const aiConfidence = Math.round((aiAssessment.confidence || 0.70) * 100);
  const aiClassification = aiAssessment.classification || 'LOW';
  const aiSignals = Array.isArray(aiAssessment.signals) ? aiAssessment.signals : [];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#2B2B2B] tracking-tight">AI Document Security & AI-Generation Analyzer</h1>
        <p className="text-xs text-[#6B7280] mt-1">
          Detect explicit AI disclosures, synthetic content declarations, PII data leaks, API keys, and independent document risk profiles.
        </p>
      </div>

      {/* Upload Box */}
      <div className="p-8 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-6">
        <form onSubmit={handleAnalyze} className="space-y-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-[#E5E7EB] hover:border-[#8E9A7D] rounded-2xl p-10 text-center transition-all bg-[#F8F7F4] cursor-pointer group flex flex-col items-center justify-center space-y-3"
          >
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
              className="hidden"
              id="documentFileInput"
            />
            <label htmlFor="documentFileInput" className="cursor-pointer space-y-3 flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-[#8E9A7D]/15 text-[#7F8F73] flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
                <UploadCloud className="w-7 h-7 stroke-[1.75]" />
              </div>
              <div>
                <span className="text-sm font-semibold text-[#2B2B2B] group-hover:text-[#7F8F73] transition-colors">
                  {selectedFile ? selectedFile.name : 'Drag & drop document here, or click to browse'}
                </span>
                <p className="text-xs text-[#9CA3AF] mt-1">Supported Formats: PDF, DOCX, TXT (Max size 10MB)</p>
              </div>
            </label>
          </div>

          {selectedFile && (
            <div className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="text-[#8E9A7D] w-5 h-5 stroke-[1.75]" />
                  <div>
                    <p className="font-semibold text-[#2B2B2B]">{selectedFile.name}</p>
                    <p className="text-[#6B7280]">{(fileSizeBytes / 1024).toFixed(1)} KB • {selectedFile.type || 'Document'}</p>
                  </div>
                </div>
                <span className="text-[#5B8C5A] font-semibold">Ready for Analysis</span>
              </div>
              {fileChecksum && (
                <p className="text-[11px] font-mono text-[#9CA3AF]">
                  SHA-256 Checksum: <strong className="text-[#2B2B2B]">{fileChecksum}</strong>
                </p>
              )}
            </div>
          )}

          {loading && (
            <div className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-3">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[#7F8F73] font-semibold">Executing Pipeline Steps...</span>
                <span className="text-[#2B2B2B] font-bold">{Math.round((scanStep / 6) * 100)}%</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                {stepsList.map((stepName, idx) => (
                  <div key={idx} className="flex items-center space-x-1.5">
                    {scanStep > idx + 1 ? (
                      <Check className="w-3.5 h-3.5 text-[#5B8C5A]" />
                    ) : scanStep === idx + 1 ? (
                      <Loader2 className="w-3.5 h-3.5 text-[#8E9A7D] animate-spin" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-[#E5E7EB] inline-block" />
                    )}
                    <span className={scanStep > idx ? 'text-[#2B2B2B] font-medium' : 'text-[#9CA3AF]'}>{stepName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !selectedFile}
            className="w-full py-3.5 bg-[#8E9A7D] hover:bg-[#7F8F73] disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF] text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center space-x-2 shadow-xs"
          >
            <Search className="w-4 h-4 stroke-[1.75]" />
            <span>{loading ? 'Analyzing Document Security & AI Generation...' : 'Run Document Security Scan'}</span>
          </button>
        </form>
      </div>

      {/* Analysis Results View */}
      {analysisResult && (
        <div className="space-y-8">
          {/* Top KPI Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs">
              <span className="text-xs text-[#6B7280]">Document Trust Score</span>
              <p className="text-2xl font-black text-[#5B8C5A] mt-1">
                {score} / 100
              </p>
            </div>

            <div className="p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs">
              <span className="text-xs text-[#6B7280]">AI Generation Likelihood</span>
              <p className="text-2xl font-black text-[#D96C6C] mt-1 flex items-center space-x-1">
                <Cpu className="w-5 h-5 stroke-[1.75]" />
                <span>{aiLikelihood}%</span>
              </p>
            </div>

            <div className="p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs">
              <span className="text-xs text-[#6B7280]">PII Leaks Found</span>
              <p className="text-2xl font-black text-[#7F8F73] mt-1">
                {sensitive.totalLeaks ?? 0} Incidents
              </p>
            </div>

            <div className="p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs">
              <span className="text-xs text-[#6B7280]">Risk Assessment</span>
              <p
                className={`text-xs font-bold uppercase mt-1 ${
                  riskLevel === 'CRITICAL' || riskLevel === 'HIGH'
                    ? 'text-[#D96C6C]'
                    : riskLevel === 'MEDIUM'
                    ? 'text-[#D9A441]'
                    : 'text-[#5B8C5A]'
                }`}
              >
                {riskLevel} RISK
              </p>
            </div>
          </div>

          {/* AI GENERATION ASSESSMENT CARD (Phase 13) */}
          <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7EB] pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-[#8E9A7D]/15 text-[#7F8F73]">
                  <Cpu className="w-5 h-5 stroke-[1.75]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2B2B2B]">AI GENERATION ASSESSMENT</h3>
                  <p className="text-xs text-[#6B7280]">Probabilistic evaluation of synthetic generation signals & self-disclosures</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 text-xs font-mono">
                <span className="px-3 py-1 rounded-full bg-[#D96C6C]/15 text-[#D96C6C] font-bold border border-[#D96C6C]/30 uppercase">
                  CLASSIFICATION: {aiClassification}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1">
                <span className="text-[#9CA3AF]">AI Likelihood</span>
                <p className="text-2xl font-black text-[#D96C6C]">{aiLikelihood}%</p>
              </div>
              <div className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1">
                <span className="text-[#9CA3AF]">Confidence Index</span>
                <p className="text-2xl font-bold text-[#7F8F73]">{aiConfidence}%</p>
              </div>
              <div className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1">
                <span className="text-[#9CA3AF]">Detection Method</span>
                <p className="text-xs font-bold text-[#2B2B2B] capitalize pt-1">{aiAssessment.method || 'Hybrid heuristic assessment'}</p>
              </div>
            </div>

            {/* Evidence List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#2B2B2B] uppercase tracking-wider">Detected Signals & Evidence</h4>
              <div className="space-y-2 text-xs">
                {aiSignals.map((sig, idx) => (
                  <div key={idx} className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] flex items-start space-x-3">
                    <CheckCircle className="w-4 h-4 text-[#8E9A7D] flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#2B2B2B] capitalize">{sig.type.replace(/_/g, ' ')}:</strong>{' '}
                      <span className="text-[#6B7280]">{sig.description}</span>
                      {sig.evidence && <p className="text-[11px] font-mono text-[#7F8F73] mt-0.5">{sig.evidence}</p>}
                    </div>
                  </div>
                ))}
                {aiSignals.length === 0 && (
                  <p className="text-xs text-[#5B8C5A] p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB]">
                    ✓ Zero explicit AI disclosures or synthetic declarations found.
                  </p>
                )}
              </div>
            </div>

            {/* Callout Notice */}
            <div className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] flex items-start space-x-3 text-xs text-[#6B7280]">
              <Info className="w-5 h-5 text-[#8E9A7D] flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#2B2B2B]">IMPORTANT SECURITY PRINCIPLE:</strong>
                <p className="mt-0.5">
                  AI-generated content is not inherently malicious or dangerous. Verify the source and factual accuracy before relying on this document for important operational, financial, or security decisions.
                </p>
              </div>
            </div>
          </div>

          {/* DOCUMENT RISK ASSESSMENT CARD (Phase 14) */}
          <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs space-y-6">
            <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-[#5B8C5A]/15 text-[#5B8C5A]">
                  <ShieldAlert className="w-5 h-5 stroke-[1.75]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2B2B2B]">DOCUMENT RISK ASSESSMENT</h3>
                  <p className="text-xs text-[#6B7280]">Independent security evaluation based on malicious payloads, PII leaks & script risks</p>
                </div>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                  riskLevel === 'CRITICAL' || riskLevel === 'HIGH'
                    ? 'bg-[#D96C6C]/15 text-[#D96C6C] border-[#D96C6C]/30'
                    : riskLevel === 'MEDIUM'
                    ? 'bg-[#D9A441]/15 text-[#D9A441] border-[#D9A441]/30'
                    : 'bg-[#5B8C5A]/15 text-[#5B8C5A] border-[#5B8C5A]/30'
                }`}
              >
                {riskLevel} RISK LEVEL
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Risk Reasons */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#2B2B2B] uppercase tracking-wider">Risk Factors & Evaluation Reasons</h4>
                <div className="space-y-2 text-xs">
                  {riskAssessment.reasons?.map((reason, idx) => (
                    <div key={idx} className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] flex items-start space-x-2.5">
                      <AlertTriangle className="w-4 h-4 text-[#D9A441] flex-shrink-0 mt-0.5" />
                      <span className="text-[#6B7280]">{reason}</span>
                    </div>
                  ))}
                  {(!riskAssessment.reasons || riskAssessment.reasons.length === 0) && (
                    <p className="text-[#5B8C5A] p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB]">
                      Clean: Zero unencrypted PII, API keys, or malicious script payloads detected.
                    </p>
                  )}
                </div>
              </div>

              {/* Recommendations */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#2B2B2B] uppercase tracking-wider">Security Recommendations</h4>
                <div className="space-y-2 text-xs">
                  {riskAssessment.recommendations?.map((rec, idx) => (
                    <div key={idx} className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] flex items-start space-x-2.5">
                      <CheckCircle className="w-4 h-4 text-[#5B8C5A] flex-shrink-0 mt-0.5" />
                      <span className="text-[#6B7280]">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Categorized Findings System (Phase 15) */}
          {findingsList.length > 0 && (
            <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-[#2B2B2B] border-b border-[#E5E7EB] pb-3 flex items-center space-x-2">
                <FileCheck className="text-[#8E9A7D] w-4 h-4" />
                <span>Categorized Security & Authenticity Findings</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {findingsList.map((f, idx) => (
                  <div key={idx} className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-[10px] font-bold text-[#8E9A7D] uppercase tracking-wider">
                        {f.category}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          f.severity === 'CRITICAL' || f.severity === 'HIGH'
                            ? 'bg-[#D96C6C]/15 text-[#D96C6C]'
                            : f.severity === 'WARNING'
                            ? 'bg-[#D9A441]/15 text-[#D9A441]'
                            : 'bg-[#5B8C5A]/15 text-[#5B8C5A]'
                        }`}
                      >
                        {f.severity}
                      </span>
                    </div>
                    <h4 className="font-bold text-[#2B2B2B]">{f.title}</h4>
                    <p className="text-[#6B7280] leading-relaxed">{f.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Masked Sensitive PII Breakdown */}
          <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-[#2B2B2B] border-b border-[#E5E7EB] pb-3 flex items-center space-x-2">
              <Key className="text-[#D96C6C] w-4 h-4" />
              <span>Masked Sensitive Information Breakdown</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-3.5 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1">
                <span className="text-[#6B7280]">API Keys & Tokens</span>
                <p className="text-lg font-bold text-[#D96C6C]">{sensitive.details?.apiKeyCount || 0} Expose(s)</p>
                <span className="text-[11px] font-mono text-[#9CA3AF]">Masked: sk_live_...****</span>
              </div>

              <div className="p-3.5 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1">
                <span className="text-[#6B7280]">Social Security Numbers</span>
                <p className="text-lg font-bold text-[#D96C6C]">{sensitive.details?.ssnCount || 0} Expose(s)</p>
                <span className="text-[11px] font-mono text-[#9CA3AF]">Masked: ***-**-1234</span>
              </div>

              <div className="p-3.5 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1">
                <span className="text-[#6B7280]">Credit Card Numbers</span>
                <p className="text-lg font-bold text-[#D96C6C]">{sensitive.details?.creditCardCount || 0} Expose(s)</p>
                <span className="text-[11px] font-mono text-[#9CA3AF]">Masked: 4111-****-1111</span>
              </div>

              <div className="p-3.5 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1">
                <span className="text-[#6B7280]">Phishing URLs</span>
                <p className="text-lg font-bold text-[#D9A441]">{sensitive.details?.suspiciousUrlCount || 0} Pattern(s)</p>
                <span className="text-[11px] font-mono text-[#9CA3AF]">High-risk domain scan</span>
              </div>
            </div>
          </div>

          {/* Raw Technical JSON Collapsible */}
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
