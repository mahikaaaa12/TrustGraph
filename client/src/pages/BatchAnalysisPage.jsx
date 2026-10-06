import React, { useState } from 'react';
import api from '../services/api';
import { useErrorLogs } from '../context/ErrorLogContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
  Download,
  Loader2,
  Shield,
  FileText,
  Image as ImageIcon,
  Globe,
  Filter,
  Check,
  AlertCircle,
  Eye,
  X,
} from 'lucide-react';
import AnalysisLoader from '../components/common/AnalysisLoader';

export default function BatchAnalysisPage() {
  const { showToast } = useErrorLogs();

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [batchData, setBatchData] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedItemModal, setSelectedItemModal] = useState(null);

  // File selection
  const handleFileSelection = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    if (selectedFiles.length > 20) {
      showToast('Maximum 20 files allowed per batch.', 'error');
      setFiles(selectedFiles.slice(0, 20));
    } else {
      setFiles(selectedFiles);
    }
  };

  // Start Batch Analysis
  const handleStartBatchAnalysis = async () => {
    if (files.length === 0) {
      showToast('Please select at least one file or CSV manifest to start batch analysis.', 'error');
      return;
    }

    setLoading(true);
    setBatchData(null);

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      showToast(`Analyzing batch of ${files.length} items…`, 'info');
      const res = await api.post('/creator/batch', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success && res.data?.data) {
        setBatchData(res.data.data);
        showToast(`Batch Analysis Complete! ${res.data.data.summary.totalAnalyzed} items processed.`, 'success');
      }
    } catch (err) {
      showToast(err.message || 'Batch content analysis failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Export Results
  const handleExportResults = () => {
    if (!batchData || !batchData.results) return;

    const headers = ['Content', 'Type', 'Trust Score', 'Risk', 'AI Signal', 'Security', 'Status', 'Findings'];
    const rows = batchData.results.map((r) => [
      `"${r.identifier}"`,
      r.type,
      r.trustScore !== null ? r.trustScore : 'N/A',
      r.risk,
      r.aiSignal,
      r.security,
      r.status,
      `"${(r.findings || []).join('; ')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `TrustGraph_Batch_Analysis_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Batch analysis results exported as CSV!', 'success');
  };

  // Reset
  const handleReset = () => {
    setFiles([]);
    setBatchData(null);
    setSelectedItemModal(null);
  };

  // Filter Results
  const getFilteredResults = () => {
    if (!batchData?.results) return [];
    switch (activeFilter) {
      case 'High Risk':
        return batchData.results.filter((r) => r.risk === 'High');
      case 'Medium Risk':
        return batchData.results.filter((r) => r.risk === 'Medium');
      case 'Low Risk':
        return batchData.results.filter((r) => r.risk === 'Low');
      case 'AI Signals':
        return batchData.results.filter((r) => r.aiSignal === 'High' || r.aiSignal === 'Medium' || r.aiSignal === 'Moderate');
      case 'Security Issues':
        return batchData.results.filter((r) => r.security === 'Suspicious' || r.security === 'Critical');
      default:
        return batchData.results;
    }
  };

  const filteredResults = getFilteredResults();
  const summary = batchData?.summary || {
    totalAnalyzed: 0,
    lowRiskCount: 0,
    mediumRiskCount: 0,
    highRiskCount: 0,
    aiSignalsCount: 0,
    securityWarningsCount: 0,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 pb-5">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-[#8E9A7D] to-[#7F8F73] text-white shadow-sm">
          <Layers size={26} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Batch Content Analysis</h1>
          <p className="text-sm text-gray-500">
            Analyze multiple images, documents, text files, or a CSV manifest in one operation
          </p>
        </div>
      </div>

      {/* Input Dropzone & Upload Controls */}
      {!batchData && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="p-8 rounded-3xl border-2 border-dashed border-gray-300 bg-white hover:border-[#8E9A7D] transition-all text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#8E9A7D]/10 text-[#8E9A7D] flex items-center justify-center mx-auto">
              <Upload size={30} />
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-800">Upload Content Files or CSV Manifest</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                Select multiple Images (JPEG/PNG/WEBP), Documents (PDF/DOCX/TXT), or a CSV manifest containing{' '}
                <span className="font-mono text-gray-700">caption, url, content identifier</span> headers.
              </p>
            </div>

            <label className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white bg-[#8E9A7D] hover:bg-[#7F8F73] cursor-pointer transition-colors shadow-sm">
              <Upload size={16} />
              Upload Content
              <input type="file" multiple accept="image/*,.pdf,.docx,.doc,.txt,.md,.csv" onChange={handleFileSelection} className="hidden" />
            </label>

            {files.length > 0 && (
              <div className="pt-4 border-t border-gray-100 max-w-lg mx-auto">
                <p className="text-xs font-semibold text-gray-700 mb-2">Selected Files ({files.length}):</p>
                <div className="flex flex-wrap gap-2 justify-center max-h-36 overflow-y-auto p-1">
                  {files.map((f, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 border border-gray-200 text-gray-700">
                      {f.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleStartBatchAnalysis}
            disabled={loading || files.length === 0}
            className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-bold text-white text-base transition-all shadow-md disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #8E9A7D, #7F8F73)' }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Analyzing Batch Content ({files.length} items)…
              </>
            ) : (
              <>
                <Layers size={18} />
                Start Batch Analysis
              </>
            )}
          </button>
        </motion.div>
      )}

      {/* Loading State Display */}
      {loading && (
        <AnalysisLoader
          batch={true}
          message={`Analyzing ${files.length || 'batch'} content items...`}
          subMessage="TrustGraph is processing your submitted batch files and content manifest."
        />
      )}

      {/* Results View */}
      {!loading && batchData && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">TOTAL ANALYZED</span>
              <div className="text-3xl font-black text-gray-900">{summary.totalAnalyzed}</div>
              <p className="text-[11px] text-gray-500">Total batch items</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">LOW RISK</span>
              <div className="text-3xl font-black text-[#5B8C5A]">{summary.lowRiskCount}</div>
              <p className="text-[11px] text-gray-500">Clean content</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">MEDIUM RISK</span>
              <div className="text-3xl font-black text-[#D9A441]">{summary.mediumRiskCount}</div>
              <p className="text-[11px] text-gray-500">Review recommended</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">HIGH RISK</span>
              <div className="text-3xl font-black text-[#D96C6C]">{summary.highRiskCount}</div>
              <p className="text-[11px] text-gray-500">Flagged content</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">AI SIGNALS</span>
              <div className="text-3xl font-black text-yellow-600">{summary.aiSignalsCount}</div>
              <p className="text-[11px] text-gray-500">Synthetic text/image cues</p>
            </div>
          </div>

          {/* Filter Bar & Export Actions */}
          <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-gray-500 mr-1 flex items-center gap-1">
                <Filter size={14} /> Filter:
              </span>
              {['All', 'High Risk', 'Medium Risk', 'Low Risk', 'AI Signals', 'Security Issues'].map((filterName) => (
                <button
                  key={filterName}
                  onClick={() => setActiveFilter(filterName)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeFilter === filterName
                      ? 'bg-[#8E9A7D] text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filterName}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportResults}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white font-bold text-xs hover:bg-gray-800 transition-colors"
              >
                <Download size={14} />
                Export Results
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-50 transition-colors"
              >
                <RefreshCw size={14} />
                Analyze Another Batch
              </button>
            </div>
          </div>

          {/* Results Table */}
          <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Batch Execution Results</h3>
              <span className="text-xs text-gray-400 font-mono">Showing {filteredResults.length} of {summary.totalAnalyzed} items</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5 rounded-l-xl">Content</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Trust Score</th>
                    <th className="p-3.5">Risk</th>
                    <th className="p-3.5">AI Signal</th>
                    <th className="p-3.5">Security</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredResults.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/70 transition-colors font-medium">
                      <td className="p-3.5 text-gray-900 font-semibold truncate max-w-xs">{row.identifier}</td>
                      <td className="p-3.5 text-gray-600">{row.type}</td>
                      <td className="p-3.5 font-bold text-gray-900">
                        {row.trustScore !== null ? `${row.trustScore}` : 'N/A'}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            row.risk === 'High'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : row.risk === 'Medium'
                              ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                              : 'bg-green-50 text-green-700 border border-green-200'
                          }`}
                        >
                          {row.risk}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            row.aiSignal === 'High'
                              ? 'bg-yellow-100 text-yellow-800'
                              : row.aiSignal === 'Medium'
                              ? 'bg-yellow-50 text-yellow-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {row.aiSignal}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            row.security === 'Safe'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {row.security}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                            row.status === 'Complete' ? 'text-green-700' : 'text-red-600'
                          }`}
                        >
                          {row.status === 'Complete' ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                          {row.status}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <button
                          onClick={() => setSelectedItemModal(row)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#8E9A7D] hover:underline"
                        >
                          <Eye size={13} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* Item Detail Modal */}
      <AnimatePresence>
        {selectedItemModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-gray-200">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-base font-bold text-gray-900">{selectedItemModal.identifier}</h3>
                <button onClick={() => setSelectedItemModal(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-gray-50">
                    <span className="text-gray-400 font-semibold block">Type</span>
                    <span className="font-bold text-gray-800">{selectedItemModal.type}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50">
                    <span className="text-gray-400 font-semibold block">Trust Score</span>
                    <span className="font-bold text-gray-800">{selectedItemModal.trustScore !== null ? selectedItemModal.trustScore : 'N/A'}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="font-bold text-gray-700 block">Findings & Telemetry:</span>
                  <div className="space-y-1">
                    {selectedItemModal.findings?.map((f, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-gray-700">
                        • {f}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button onClick={() => setSelectedItemModal(null)} className="px-4 py-2 rounded-xl bg-gray-900 text-white font-bold text-xs">
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
