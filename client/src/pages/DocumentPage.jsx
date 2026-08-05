import React, { useState } from 'react';
import api from '../services/api';
import { useErrorLogs } from '../context/ErrorLogContext';
import { motion } from 'framer-motion';
import { UploadCloud, FileText, Search, ShieldCheck, AlertTriangle, CheckCircle, Key } from 'lucide-react';

export default function DocumentPage() {
  const { showToast } = useErrorLogs();
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setAnalysisResult(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setAnalysisResult(null);
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast('Please select a PDF, DOCX, or TXT file to analyze.', 'error');
      return;
    }

    setLoading(true);
    setScanProgress(20);
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      setScanProgress(45);
      const uploadRes = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const fileId = uploadRes.data?.data?.file?._id;
      setScanProgress(75);

      const analyzeRes = await api.post('/documents/analyze', { fileId });

      setScanProgress(100);
      setAnalysisResult(analyzeRes.data?.data);
      showToast('Document security analysis completed!', 'success');
    } catch (err) {
      showToast(err.message || 'Document analysis failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#2B2B2B] tracking-tight">AI Document Security & PII Analyzer</h1>
        <p className="text-xs text-[#6B7280] mt-1">
          Detect sensitive PII exposures, API keys, document metadata forgery, and trust score metrics across PDF, DOCX, and TXT files.
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
            <div className="flex items-center justify-between p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] text-xs">
              <div className="flex items-center space-x-3">
                <FileText className="text-[#8E9A7D] w-5 h-5 stroke-[1.75]" />
                <div>
                  <p className="font-semibold text-[#2B2B2B]">{selectedFile.name}</p>
                  <p className="text-[#6B7280]">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <span className="text-[#5B8C5A] font-semibold">Ready for Parsing</span>
            </div>
          )}

          {loading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[#7F8F73]">Scanning Document Metadata & Regex Scanners...</span>
                <span className="text-[#2B2B2B] font-bold">{scanProgress}%</span>
              </div>
              <div className="h-2 w-full bg-[#F3F2EF] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#8E9A7D]"
                  animate={{ width: `${scanProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !selectedFile}
            className="w-full py-3.5 bg-[#8E9A7D] hover:bg-[#7F8F73] disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF] text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center space-x-2 shadow-xs"
          >
            <Search className="w-4 h-4 stroke-[1.75]" />
            <span>{loading ? 'Analyzing Document Integrity...' : 'Run Document Security Scan'}</span>
          </button>
        </form>
      </div>

      {/* Analysis Results View */}
      {analysisResult && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs">
              <span className="text-xs text-[#6B7280]">Document Trust Score</span>
              <p className="text-2xl font-black text-[#5B8C5A] mt-1">
                {analysisResult.documentTrustScore} / 100
              </p>
            </div>
            <div className="p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs">
              <span className="text-xs text-[#6B7280]">PII Leaks Found</span>
              <p className="text-2xl font-black text-[#D96C6C] mt-1">
                {analysisResult.sensitiveInfoCount} Incidents
              </p>
            </div>
            <div className="p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs">
              <span className="text-xs text-[#6B7280]">Page Count</span>
              <p className="text-xl font-bold text-[#7F8F73] mt-1">
                {analysisResult.metadata?.numPages || 1} Pages
              </p>
            </div>
            <div className="p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs">
              <span className="text-xs text-[#6B7280]">Risk Assessment</span>
              <p className="text-xs font-bold text-[#D9A441] uppercase mt-1">
                {analysisResult.riskCategory?.toUpperCase()} RISK
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-[#2B2B2B] border-b border-[#E5E7EB] pb-3 flex items-center space-x-2">
                <Key className="text-[#D96C6C] w-4 h-4" />
                <span>Detected Sensitive Information (PII)</span>
              </h3>
              <pre className="p-4 bg-[#F8F7F4] rounded-xl text-xs font-mono text-[#D96C6C] border border-[#E5E7EB] overflow-x-auto">
                {JSON.stringify(analysisResult.detectedPII, null, 2)}
              </pre>
            </div>

            <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-[#2B2B2B] border-b border-[#E5E7EB] pb-3 flex items-center space-x-2">
                <ShieldCheck className="text-[#7F8F73] w-4 h-4" />
                <span>Remediation Recommendations</span>
              </h3>
              <ul className="space-y-2.5 text-xs text-[#6B7280]">
                {analysisResult.recommendations?.map((rec, idx) => (
                  <li key={idx} className="flex items-start space-x-2.5 p-2.5 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB]">
                    <CheckCircle className="text-[#5B8C5A] w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
