import React, { useState } from 'react';
import api from '../services/api';
import { useErrorLogs } from '../context/ErrorLogContext';
import { motion } from 'framer-motion';
import {
  FaCloudUploadAlt,
  FaFilePdf,
  FaFileWord,
  FaFileAlt,
  FaSearch,
  FaShieldAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaKey,
} from 'react-icons/fa';

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
        <h1 className="text-2xl font-bold text-white tracking-tight">AI Document Security & PII Analyzer</h1>
        <p className="text-sm text-slate-400 mt-1">
          Detect sensitive PII exposures, API keys, document metadata forgery, and trust score metrics across PDF, DOCX, and TXT files.
        </p>
      </div>

      {/* Drag & Drop File Upload Panel */}
      <div className="p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
        <form onSubmit={handleAnalyze} className="space-y-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-slate-800 hover:border-blue-500/80 rounded-2xl p-8 text-center transition-all bg-slate-950/50 cursor-pointer group flex flex-col items-center justify-center space-y-3"
          >
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
              className="hidden"
              id="documentFileInput"
            />
            <label htmlFor="documentFileInput" className="cursor-pointer space-y-3 flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                <FaCloudUploadAlt />
              </div>
              <div>
                <span className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                  {selectedFile ? selectedFile.name : 'Drag & drop document here, or click to browse'}
                </span>
                <p className="text-xs text-slate-500 mt-1">Supported Formats: PDF, DOCX, TXT (Max size 10MB)</p>
              </div>
            </label>
          </div>

          {/* Selected File Details */}
          {selectedFile && (
            <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs">
              <div className="flex items-center space-x-3">
                <FaFilePdf className="text-rose-400 text-lg" />
                <div>
                  <p className="font-semibold text-white">{selectedFile.name}</p>
                  <p className="text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <span className="text-emerald-400 font-semibold">Ready for Parsing</span>
            </div>
          )}

          {/* Scan Animation Bar */}
          {loading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-blue-400">Scanning Document Metadata & Regex Scanners...</span>
                <span className="text-white font-bold">{scanProgress}%</span>
              </div>
              <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-blue-500"
                  animate={{ width: `${scanProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !selectedFile}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20"
          >
            <FaSearch />
            <span>{loading ? 'Analyzing Document Integrity...' : 'Run Document Security Scan'}</span>
          </button>
        </form>
      </div>

      {/* Analysis Results View */}
      {analysisResult && (
        <div className="space-y-8">
          {/* Top Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400">Document Trust Score</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                {analysisResult.documentTrustScore} / 100
              </p>
            </div>
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400">PII Leaks Found</span>
              <p className="text-2xl font-black text-rose-400 mt-1">
                {analysisResult.sensitiveInfoCount} Incidents
              </p>
            </div>
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400">Page Count</span>
              <p className="text-xl font-bold text-blue-400 mt-1">
                {analysisResult.metadata?.numPages || 1} Pages
              </p>
            </div>
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400">Risk Assessment</span>
              <p className="text-sm font-bold text-amber-400 capitalize mt-1">
                {analysisResult.riskCategory?.toUpperCase()} RISK
              </p>
            </div>
          </div>

          {/* Details & Telemetry Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PII Incidents */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center space-x-2">
                <FaKey className="text-rose-400" />
                <span>Detected Sensitive Information (PII)</span>
              </h3>
              <pre className="p-4 bg-slate-950 rounded-xl text-xs font-mono text-rose-300 border border-slate-800 overflow-x-auto">
                {JSON.stringify(analysisResult.detectedPII, null, 2)}
              </pre>
            </div>

            {/* Recommendations */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center space-x-2">
                <FaShieldAlt className="text-blue-400" />
                <span>Remediation Recommendations</span>
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-300">
                {analysisResult.recommendations?.map((rec, idx) => (
                  <li key={idx} className="flex items-start space-x-2.5 p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                    <FaCheckCircle className="text-emerald-400 mt-0.5 flex-shrink-0" />
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
