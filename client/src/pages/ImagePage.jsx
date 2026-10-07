import React, { useState } from 'react';
import api from '../services/api';
import { useErrorLogs } from '../context/ErrorLogContext';
import {
  Image as ImageIcon,
  Search,
  Camera,
  Cpu,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Check,
  Loader2,
  ShieldCheck,
  Info,
  ShieldAlert,
  FileCheck,
  ZoomIn,
  X,
} from 'lucide-react';
import AnalysisLoader from '../components/common/AnalysisLoader';

function normalizeImageAnalysisResponse(response) {
  if (!response) return null;
  const body = response.data !== undefined ? response.data : response;
  if (!body) return null;

  if (body.data && typeof body.data === 'object' && !Array.isArray(body.data)) {
    return body.data;
  }
  if (body.analysis && typeof body.analysis === 'object' && !Array.isArray(body.analysis)) {
    return body.analysis;
  }
  if (body.result && typeof body.result === 'object' && !Array.isArray(body.result)) {
    return body.result;
  }
  if (
    body.overallTrustScore !== undefined ||
    body.trustScore !== undefined ||
    body.aiGenerationAssessment !== undefined ||
    body.exifData !== undefined
  ) {
    return body;
  }
  return null;
}

export default function ImagePage() {
  const { showToast } = useErrorLogs();
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [elaImageError, setElaImageError] = useState(false);
  const [activeZoomModal, setActiveZoomModal] = useState(null); // 'original' | 'ela' | null

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setAnalysisResult(null);
      setAnalysisError(null);
      setElaImageError(false);
    }
  };

  const handleAnalyze = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedFile) {
      showToast('Please select an image file (JPEG, PNG, WEBP).', 'error');
      return;
    }

    setLoading(true);
    setAnalysisError(null);
    setElaImageError(false);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Step 1: Upload image file to server
      const uploadRes = await api.post('/files/upload', formData);

      if (uploadRes.status < 200 || uploadRes.status >= 300) {
        throw new Error(uploadRes.data?.message || `Upload failed with status ${uploadRes.status}`);
      }

      const fileObj = uploadRes.data?.data?.file;
      const fileId = fileObj?._id || uploadRes.data?.data?._id;
      if (!fileId) {
        throw new Error(uploadRes.data?.message || 'Image upload did not return a valid file identifier.');
      }

      // Step 2: Trigger image forensics analysis
      const analyzeRes = await api.post('/images/analyze', { fileId });

      if (analyzeRes.status < 200 || analyzeRes.status >= 300) {
        throw new Error(analyzeRes.data?.message || `Analysis failed with status ${analyzeRes.status}`);
      }

      console.log('[Image Analysis] response:', analyzeRes);
      console.log('[Image Analysis] response data:', analyzeRes?.data);

      const normalizedResult = normalizeImageAnalysisResponse(analyzeRes);
      console.log('[Image Analysis] normalized result:', normalizedResult);

      if (!normalizedResult) {
        throw new Error('Analysis completed but returned an invalid data payload.');
      }

      setAnalysisResult(normalizedResult);
      showToast('Image forensics & ELA analysis completed!', 'success');
    } catch (err) {
      console.error('[Image Analysis] error:', err);
      const errMsg = err?.message || err?.data?.message || 'Image analysis failed.';
      setAnalysisError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const exif = analysisResult?.exifData || {};
  const ela = analysisResult?.errorLevelAnalysis || {};
  const stats = ela.statistics || {};
  const viz = ela.visualization || {};
  const aiAssessment = analysisResult?.aiGenerationAssessment || {};
  const manipAssessment = analysisResult?.manipulationAssessment || {};
  const provenanceAssessment = analysisResult?.provenanceAssessment || {};
  const riskAssessment = analysisResult?.riskAssessment || {};
  const signalsList = Array.isArray(analysisResult?.signals) ? analysisResult.signals : [];

  const score = analysisResult?.overallTrustScore ?? analysisResult?.trustScore ?? 85;
  const riskLevel = (riskAssessment.riskLevel || analysisResult?.riskCategory || 'LOW').toUpperCase();

  const aiLikelihood = Math.round((aiAssessment.likelihood ?? 0.05) * 100);
  const manipLikelihood = Math.round((manipAssessment.likelihood ?? 0.10) * 100);

  const originalPreviewUrl = React.useMemo(() => {
    if (!selectedFile) return '';
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  React.useEffect(() => {
    return () => {
      if (originalPreviewUrl) {
        URL.revokeObjectURL(originalPreviewUrl);
      }
    };
  }, [originalPreviewUrl]);

  const getElaHeatmapUrl = () => {
    let apiHost = (import.meta.env.VITE_API_URL || 'http://localhost:5000').trim().replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '').replace(/\/+$/, '');
    if (analysisResult?.analysisId) {
      return `${apiHost}/api/v1/images/${analysisResult.analysisId}/ela`;
    }
    const rawUrl = ela.elaHeatmapUrl || (ela.elaHeatmapFileName ? `/uploads/${ela.elaHeatmapFileName}` : '');
    if (!rawUrl) return '';
    if (rawUrl.startsWith('http')) return rawUrl;
    return `${apiHost}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#2B2B2B] tracking-tight">Image Forensics & ELA Inspection</h1>
        <p className="text-xs text-[#6B7280] mt-1">
          Detect AI image generation signatures, digital manipulation traces, EXIF provenance tags, and normalized Error Level Analysis heatmaps.
        </p>
      </div>

      <div className="p-8 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-6">
        <form onSubmit={handleAnalyze} className="space-y-6">
          <div className="border-2 border-dashed border-[#E5E7EB] hover:border-[#8E9A7D] rounded-2xl p-10 text-center transition-all bg-[#F8F7F4] cursor-pointer group flex flex-col items-center justify-center space-y-3">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
              id="imageFileInput"
            />
            <label htmlFor="imageFileInput" className="cursor-pointer space-y-3 flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-[#8E9A7D]/15 text-[#7F8F73] flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
                <Camera className="w-7 h-7 stroke-[1.75]" />
              </div>
              <div>
                <span className="text-sm font-semibold text-[#2B2B2B] group-hover:text-[#7F8F73] transition-colors">
                  {selectedFile ? selectedFile.name : 'Select image file (JPEG, PNG, WEBP)'}
                </span>
                <p className="text-xs text-[#9CA3AF] mt-1">Maximum upload size 10MB</p>
              </div>
            </label>
          </div>

          {loading && (
            <AnalysisLoader
              message="Executing Image Forensics Pipeline..."
              subMessage="TrustGraph is extracting EXIF tags, scanning pixel ELA heatmaps, and computing AI manipulation signatures."
            />
          )}

          <button
            type="submit"
            disabled={loading || !selectedFile}
            className="w-full py-3.5 bg-[#8E9A7D] hover:bg-[#7F8F73] disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF] text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center space-x-2 shadow-xs"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 stroke-[1.75]" />}
            <span>{loading ? 'Computing ELA & Forensics...' : 'Run Image Forensics Scan'}</span>
          </button>
        </form>
      </div>

      {analysisError && !loading && (
        <div className="p-6 bg-white border border-[#D96C6C]/40 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-[#D96C6C]/15 text-[#D96C6C] shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 stroke-[1.75]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#2B2B2B]">Image Analysis Failed</h3>
              <p className="text-xs text-[#6B7280]">{analysisError}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={handleAnalyze}
              className="px-4 py-2 bg-[#8E9A7D] hover:bg-[#7F8F73] text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
            >
              Retry Analysis
            </button>
            <button
              type="button"
              onClick={() => setAnalysisError(null)}
              className="px-4 py-2 bg-[#F8F7F4] hover:bg-[#E5E7EB] text-[#2B2B2B] text-xs font-semibold rounded-xl transition-colors border border-[#E5E7EB]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {analysisResult && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs">
              <span className="text-xs text-[#6B7280]">Image Trust Score</span>
              <p className={`text-2xl font-black mt-1 ${score >= 75 ? 'text-[#5B8C5A]' : score >= 50 ? 'text-[#D9A441]' : 'text-[#D96C6C]'}`}>
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
              <span className="text-xs text-[#6B7280]">Manipulation Score</span>
              <p className="text-2xl font-black text-[#7F8F73] mt-1">{manipLikelihood}%</p>
            </div>
            <div className="p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs">
              <span className="text-xs text-[#6B7280]">Risk Assessment</span>
              <p className="text-xs font-bold text-[#D9A441] uppercase mt-1">{riskLevel} RISK</p>
            </div>
          </div>

          {/* AUTHENTICITY ASSESSMENT CARD */}
          <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7EB] pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-[#8E9A7D]/15 text-[#7F8F73]">
                  <Camera className="w-5 h-5 stroke-[1.75]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2B2B2B]">AUTHENTICITY ASSESSMENT</h3>
                  <p className="text-xs text-[#6B7280]">AI generation likelihood, editing software traces, and sensor provenance</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-3 py-1 rounded-full font-mono text-xs font-bold uppercase border ${
                  aiAssessment.detected
                    ? 'bg-[#D96C6C]/15 text-[#D96C6C] border-[#D96C6C]/30'
                    : aiLikelihood >= 35 || manipAssessment.detected
                    ? 'bg-[#D9A441]/15 text-[#D9A441] border-[#D9A441]/30'
                    : provenanceAssessment.status === 'VERIFIED'
                    ? 'bg-[#5B8C5A]/15 text-[#5B8C5A] border-[#5B8C5A]/30'
                    : 'bg-gray-100 text-gray-700 border-gray-300'
                }`}>
                  CLASSIFICATION: {
                    aiAssessment.detected
                      ? 'AI GENERATED'
                      : aiLikelihood >= 35 || manipAssessment.detected
                      ? 'SUSPICIOUS'
                      : provenanceAssessment.status === 'VERIFIED'
                      ? 'AUTHENTIC'
                      : 'INCONCLUSIVE'
                  }
                </span>

                <span className="px-3 py-1 rounded-full bg-[#8E9A7D]/15 text-[#7F8F73] font-mono text-xs font-bold uppercase border border-[#8E9A7D]/30">
                  PROVENANCE: {provenanceAssessment.status || 'LIMITED'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1">
                <span className="text-[#9CA3AF]">AI Likelihood</span>
                <p className="text-2xl font-black text-[#D96C6C]">{aiLikelihood}%</p>
              </div>
              <div className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1">
                <span className="text-[#9CA3AF]">Manipulation Index</span>
                <p className="text-2xl font-bold text-[#7F8F73]">{manipLikelihood}%</p>
              </div>
              <div className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1">
                <span className="text-[#9CA3AF]">EXIF Hardware</span>
                <p className="text-xs font-bold text-[#2B2B2B] pt-1">{exif.make ? `${exif.make} ${exif.model || ''}` : 'No Camera Hardware Tags'}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#2B2B2B] uppercase tracking-wider">Forensics Signals & Evidence</h4>
              <div className="space-y-2 text-xs">
                {signalsList.map((sig, idx) => (
                  <div key={idx} className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] flex items-start space-x-2.5">
                    <CheckCircle className="w-4 h-4 text-[#8E9A7D] flex-shrink-0 mt-0.5" />
                    <span className="text-[#6B7280]">{typeof sig === 'string' ? sig : sig.description}</span>
                  </div>
                ))}
                {signalsList.length === 0 && (
                  <p className="text-xs text-[#5B8C5A] p-3 bg-[#F8F7F4] rounded-xl">✓ No digital editing software traces or synthetic artifacts found.</p>
                )}
              </div>
            </div>

            <div className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] flex items-start space-x-3 text-xs text-[#6B7280]">
              <Info className="w-5 h-5 text-[#8E9A7D] flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#2B2B2B]">DETECTION ≠ DANGER:</strong>
                <p className="mt-0.5">AI-generated or edited images are not inherently malicious. Verify context and provenance before relying on this image for high-impact decisions.</p>
              </div>
            </div>
          </div>

          {/* ELA SIDE-BY-SIDE VISUALIZATION & INTERPRETATION */}
          {(ela.elaDataUrl || ela.elaHeatmapFileName) && (
            <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E7EB] pb-3">
                <h3 className="text-sm font-bold text-[#2B2B2B]">Error Level Analysis (ELA) Side-by-Side Visualization</h3>
                <span className="text-xs font-mono text-[#8E9A7D]">
                  Method: {viz.method || 'JPEG recompression analysis'} • Quality: {viz.recompressionQuality || 95}%
                </span>
              </div>

              {/* Side-by-Side Image Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Original Image */}
                <div className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-3 flex flex-col">
                  <div className="flex justify-between items-center text-xs font-bold text-[#2B2B2B]">
                    <span>Original Source Image</span>
                    {originalPreviewUrl && (
                      <button
                        onClick={() => setActiveZoomModal('original')}
                        className="text-[#8E9A7D] hover:text-[#7F8F73] flex items-center space-x-1 font-normal text-[11px]"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>Zoom Original</span>
                      </button>
                    )}
                  </div>

                  <div className="flex-1 flex items-center justify-center min-h-[220px]">
                    {originalPreviewUrl ? (
                      <img src={originalPreviewUrl} alt="Original Upload" className="max-h-72 rounded-lg object-contain border border-[#E5E7EB]" />
                    ) : (
                      <span className="text-xs text-[#9CA3AF]">Original image preview</span>
                    )}
                  </div>
                </div>

                {/* ELA Heatmap */}
                <div className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-3 flex flex-col">
                  <div className="flex justify-between items-center text-xs font-bold text-[#2B2B2B]">
                    <span>Normalized ELA Heatmap</span>
                    <button
                      onClick={() => setActiveZoomModal('ela')}
                      className="text-[#8E9A7D] hover:text-[#7F8F73] flex items-center space-x-1 font-normal text-[11px]"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span>Zoom ELA</span>
                    </button>
                  </div>

                  <div className="flex-1 flex items-center justify-center min-h-[220px]">
                    {elaImageError ? (
                      <div className="text-center p-6 space-y-2">
                        <AlertTriangle className="w-7 h-7 text-[#D9A441] mx-auto" />
                        <p className="text-xs font-semibold text-[#2B2B2B]">ELA Heatmap loading failed.</p>
                        <button
                          onClick={() => setElaImageError(false)}
                          className="px-3 py-1 bg-[#8E9A7D] text-white text-xs rounded-lg hover:bg-[#7F8F73]"
                        >
                          Retry
                        </button>
                      </div>
                    ) : (
                      <img
                        src={ela.elaDataUrl || getElaHeatmapUrl()}
                        alt="ELA Heatmap"
                        onError={() => setElaImageError(true)}
                        className="max-h-72 rounded-lg object-contain border border-[#E5E7EB]"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Color Intensity Legend Bar */}
              <div className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-2">
                <div className="flex justify-between text-[11px] font-bold text-[#6B7280]">
                  <span>ELA ERROR INTENSITY (Low)</span>
                  <span>(High)</span>
                </div>
                <div className="h-3 w-full rounded-full bg-gradient-to-r from-[#000000] via-[#000080] via-[#800080] via-[#ff0000] to-[#ffff00]" />
                <p className="text-[11px] text-[#6B7280] pt-1">
                  <strong>Visualization Explanation:</strong> Brighter regions indicate stronger compression error differences. These regions require further forensic review and are not by themselves proof of image manipulation.
                </p>
              </div>

              {/* ELA Raw Forensic Statistics & Interpretation Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB]">
                  <span className="text-[#9CA3AF] text-[10px]">Average Error</span>
                  <p className="text-lg font-bold text-[#2B2B2B]">{stats.meanError ?? ela.averageErrorLevel ?? 0.59}</p>
                </div>
                <div className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB]">
                  <span className="text-[#9CA3AF] text-[10px]">P95 Error</span>
                  <p className="text-lg font-bold text-[#7F8F73]">{stats.p95 ?? 2.5}</p>
                </div>
                <div className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB]">
                  <span className="text-[#9CA3AF] text-[10px]">P99 Error</span>
                  <p className="text-lg font-bold text-[#7F8F73]">{stats.p99 ?? 4.0}</p>
                </div>
                <div className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB]">
                  <span className="text-[#9CA3AF] text-[10px]">Dynamic Scale Factor</span>
                  <p className="text-lg font-bold text-[#D96C6C]">{viz.scaleFactor || ela.elaScaleFactor || 25.0}x</p>
                </div>
              </div>

              {/* Technical ELA Parameter Table */}
              <div className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-2 text-xs font-mono">
                <span className="font-bold text-[#2B2B2B] font-sans">ELA Technical Analysis Method</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-[#6B7280]">
                  <div>Method: <strong className="text-[#2B2B2B]">{viz.method || 'JPEG recompression'}</strong></div>
                  <div>Recompression Quality: <strong className="text-[#2B2B2B]">{viz.recompressionQuality || 95}%</strong></div>
                  <div>Normalization: <strong className="text-[#2B2B2B]">{viz.normalization || 'P99 Percentile Scaling'}</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* SECURITY RISK ASSESSMENT CARD */}
          <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs space-y-6">
            <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-[#5B8C5A]/15 text-[#5B8C5A]">
                  <ShieldAlert className="w-5 h-5 stroke-[1.75]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2B2B2B]">SECURITY RISK ASSESSMENT</h3>
                  <p className="text-xs text-[#6B7280]">Evaluation of polyglot binary signatures & embedded script execution markers</p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-[#5B8C5A]/15 text-[#5B8C5A] border border-[#5B8C5A]/30">
                {riskLevel} RISK LEVEL
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#2B2B2B] uppercase tracking-wider">Risk Reasons</h4>
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

      {/* Zoom Modal */}
      {activeZoomModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-3">
              <h3 className="text-sm font-bold text-[#2B2B2B]">
                {activeZoomModal === 'original' ? 'Original Source Image' : 'Normalized ELA Heatmap'}
              </h3>
              <button onClick={() => setActiveZoomModal(null)} className="p-1 hover:bg-[#F8F7F4] rounded-lg">
                <X className="w-5 h-5 text-[#6B7280]" />
              </button>
            </div>
            <div className="flex justify-center p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB]">
              <img
                src={activeZoomModal === 'original' ? originalPreviewUrl : ela.elaDataUrl || getElaHeatmapUrl()}
                alt="Zoom Inspection"
                className="max-h-[70vh] object-contain rounded-lg shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
