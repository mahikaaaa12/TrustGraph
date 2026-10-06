import React, { useState } from 'react';
import api from '../services/api';
import { useErrorLogs } from '../context/ErrorLogContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  Globe,
  Mail,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
  FileSpreadsheet,
  Upload,
  Loader2,
  Shield,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Link as LinkIcon,
  Check,
} from 'lucide-react';

const SCORE_COLOR = (score) => {
  if (score >= 80) return '#8E9A7D';
  if (score >= 60) return '#D9A441';
  return '#D96C6C';
};

export default function BrandCollaborationPage() {
  const { showToast } = useErrorLogs();

  // Input states
  const [brandWebsiteUrl, setBrandWebsiteUrl] = useState('');
  const [collaborationText, setCollaborationText] = useState('');
  const [contactUrl, setContactUrl] = useState('');
  const [contractFileId, setContractFileId] = useState(null);
  const [contractFileName, setContractFileName] = useState('');
  const [logoFileId, setLogoFileId] = useState(null);
  const [logoFileName, setLogoFileName] = useState('');

  // Execution & Result state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [createdReportId, setCreatedReportId] = useState(null);

  // Handle Contract File Upload
  const handleContractUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      showToast(`Uploading ${file.name}…`, 'info');
      const res = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success && res.data?.data) {
        setContractFileId(res.data.data._id);
        setContractFileName(file.name);
        showToast(`Contract uploaded: ${file.name}`, 'success');
      }
    } catch (err) {
      showToast(err.message || 'Contract upload failed.', 'error');
    }
  };

  // Handle Logo Upload
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      showToast(`Uploading ${file.name}…`, 'info');
      const res = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success && res.data?.data) {
        setLogoFileId(res.data.data._id);
        setLogoFileName(file.name);
        showToast(`Logo uploaded: ${file.name}`, 'success');
      }
    } catch (err) {
      showToast(err.message || 'Logo upload failed.', 'error');
    }
  };

  // Handle Submit
  const handleAnalyzeCollaboration = async (e) => {
    if (e) e.preventDefault();

    if (!brandWebsiteUrl.trim() && !collaborationText.trim() && !contractFileId && !logoFileId && !contactUrl.trim()) {
      showToast('Please provide at least one sponsorship item (Website, Message, Contract, or Logo) to analyze.', 'error');
      return;
    }

    setLoading(true);
    setResult(null);
    setCreatedReportId(null);

    try {
      const payload = {
        brandWebsiteUrl: brandWebsiteUrl.trim(),
        collaborationText: collaborationText.trim(),
        contractFileId,
        logoImageFileId: logoFileId,
        contactUrl: contactUrl.trim(),
      };

      const res = await api.post('/creator/collaboration', payload);
      if (res.data?.success && res.data?.data) {
        setResult(res.data.data);
        showToast(`Collaboration Evaluation Complete! Score: ${res.data.data.collaborationTrustScore}/100`, 'success');
      }
    } catch (err) {
      showToast(err.message || 'Collaboration evaluation failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Generate Report Action
  const handleGenerateReport = async () => {
    if (!result) return;
    setGeneratingReport(true);

    try {
      const res = await api.post('/creator/report', {
        analysisId: result.analysisId,
        title: 'Brand Sponsorship Audit Report',
        summary: `Sponsorship evaluation result: ${result.verdict}. Collaboration Trust Score: ${result.collaborationTrustScore}/100.`,
        contentTrustScore: result.collaborationTrustScore,
        riskCategory: result.collaborationTrustScore < 50 ? 'high' : result.collaborationTrustScore < 80 ? 'medium' : 'low',
        recommendations: [result.recommendation, ...(result.redFlags || [])],
      });

      if (res.data?.success && res.data?.data) {
        setCreatedReportId(res.data.data._id);
        showToast('Report generated successfully!', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Report generation failed.', 'error');
    } finally {
      setGeneratingReport(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setBrandWebsiteUrl('');
    setCollaborationText('');
    setContactUrl('');
    setContractFileId(null);
    setContractFileName('');
    setLogoFileId(null);
    setLogoFileName('');
    setResult(null);
    setCreatedReportId(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 pb-5">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-[#8E9A7D] to-[#7F8F73] text-white shadow-sm">
          <Briefcase size={26} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brand Collaboration Check</h1>
          <p className="text-sm text-gray-500">
            Evaluate whether a sponsorship or collaboration request appears legitimate before interacting
          </p>
        </div>
      </div>

      {/* Input Section */}
      {!result && (
        <motion.form initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleAnalyzeCollaboration} className="space-y-6">
          <div className="p-6 rounded-2xl border border-gray-200 bg-white shadow-sm space-y-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
              <Sparkles size={14} className="text-[#8E9A7D]" />
              Sponsorship & Collaboration Details
            </div>

            {/* Brand Website URL */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Brand Website URL</label>
              <div className="relative">
                <input
                  type="url"
                  value={brandWebsiteUrl}
                  onChange={(e) => setBrandWebsiteUrl(e.target.value)}
                  placeholder="https://brand-official.com"
                  className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#8E9A7D]"
                />
                <Globe size={15} className="absolute left-3 top-3 text-gray-400" />
              </div>
            </div>

            {/* Collaboration Email / Text */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 flex justify-between items-center">
                <span>Collaboration Email / Message Text</span>
                <span className="text-xs text-gray-400 font-normal">{collaborationText.length} characters</span>
              </label>
              <textarea
                value={collaborationText}
                onChange={(e) => setCollaborationText(e.target.value)}
                rows={4}
                placeholder="Paste the pitch email, direct message, or offer proposal details here..."
                className="w-full text-sm p-3.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#8E9A7D] resize-none"
              />
            </div>

            {/* Contract / Document File */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 flex justify-between items-center">
                <span>Attached Contract / Document</span>
                {contractFileName && <span className="text-xs font-normal text-green-600">✓ {contractFileName}</span>}
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                <FileText size={18} className="text-gray-400 shrink-0" />
                <div className="flex-1 text-xs">
                  <span className="font-medium text-gray-700">{contractFileName || 'Attach PDF Agreement or Contract (Optional)'}</span>
                  <p className="text-gray-400">PDF, DOCX, TXT (Max 10MB)</p>
                </div>
                <input type="file" accept=".pdf,.docx,.doc,.txt" onChange={handleContractUpload} className="hidden" />
              </label>
            </div>

            {/* Grid for Logo & Contact URL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Optional Brand Logo */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 flex justify-between items-center">
                  <span>Brand Logo / Image</span>
                  {logoFileName && <span className="text-xs font-normal text-green-600">✓ {logoFileName}</span>}
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                  <ImageIcon size={18} className="text-gray-400 shrink-0" />
                  <div className="flex-1 text-xs">
                    <span className="font-medium text-gray-700">{logoFileName || 'Upload Logo Image (Optional)'}</span>
                    <p className="text-gray-400">PNG, JPEG, WEBP</p>
                  </div>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
              </div>

              {/* Optional Contact URL */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Optional Contact / Form URL</label>
                <div className="relative">
                  <input
                    type="url"
                    value={contactUrl}
                    onChange={(e) => setContactUrl(e.target.value)}
                    placeholder="https://brand-official.com/contact"
                    className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#8E9A7D]"
                  />
                  <LinkIcon size={15} className="absolute left-3 top-3 text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Action Button: Analyze Collaboration */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-bold text-white text-base transition-all shadow-md hover:shadow-lg disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #8E9A7D, #7F8F73)' }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Evaluating Collaboration Security…
              </>
            ) : (
              <>
                <Briefcase size={18} />
                Analyze Collaboration
              </>
            )}
          </button>
        </motion.form>
      )}

      {/* Result Section */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Main Score Banner */}
          <div className="p-8 rounded-3xl border bg-white shadow-sm text-center relative overflow-hidden" style={{ borderColor: SCORE_COLOR(result.collaborationTrustScore) + '40' }}>
            <div className="absolute top-0 left-0 w-full h-1.5" style={{ background: SCORE_COLOR(result.collaborationTrustScore) }} />
            <p className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-2">COLLABORATION TRUST SCORE</p>
            <div className="text-6xl font-black tracking-tight" style={{ color: SCORE_COLOR(result.collaborationTrustScore) }}>
              {result.collaborationTrustScore}
              <span className="text-2xl font-semibold text-gray-400 ml-1">/ 100</span>
            </div>
            
            {/* Verdict Badge */}
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold bg-yellow-50 text-yellow-800 border border-yellow-200">
              <AlertTriangle size={15} className="text-yellow-600" />
              VERDICT: {result.verdict}
            </div>
          </div>

          {/* CHECKS Section */}
          <div className="p-6 rounded-2xl border border-gray-200 bg-white space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
              <Info size={16} className="text-blue-500" />
              Verification Checks
            </h3>
            <div className="space-y-2.5">
              {result.checks?.map((check, idx) => (
                <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 border border-gray-100 text-sm">
                  <span className="font-semibold text-gray-800">{check.name}</span>
                  <div className="flex items-center gap-2">
                    {check.status === 'pass' ? (
                      <span className="text-green-700 text-xs font-semibold flex items-center gap-1">
                        <CheckCircle2 size={15} className="text-green-600" />
                        {check.detail}
                      </span>
                    ) : (
                      <span className="text-yellow-700 text-xs font-semibold flex items-center gap-1">
                        <AlertTriangle size={15} className="text-yellow-600" />
                        {check.detail}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RED FLAGS Section */}
          <div className="p-6 rounded-2xl border border-gray-200 bg-white space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
              <AlertCircle size={16} className="text-red-500" />
              Potential Red Flags
            </h3>
            <div className="space-y-2">
              {result.redFlags?.map((flag, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-red-50/70 border border-red-200 text-xs text-red-800 font-medium">
                  <AlertTriangle size={14} className="text-red-500 shrink-0" />
                  <span className="capitalize">{flag}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RECOMMENDATION Section (Strictly using non-definitive language) */}
          <div className="p-6 rounded-2xl border border-gray-200 bg-white space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
              <Sparkles size={16} className="text-[#8E9A7D]" />
              Creator Recommendation
            </h3>
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-sm text-gray-800 font-medium">
              "{result.recommendation}"
            </div>
            <p className="text-[11px] text-gray-400 italic">
              Note: TrustGraph provides risk indicators based on multi-modal telemetry and does not make definitive legal claims.
            </p>
          </div>

          {/* ACTIONS */}
          <div className="p-6 rounded-2xl border border-gray-200 bg-white flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={handleGenerateReport}
              disabled={generatingReport}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white transition-all shadow-sm disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #2B2B2B, #404040)' }}
            >
              {generatingReport ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
              Generate Report
            </button>

            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm border border-[#8E9A7D] text-[#8E9A7D] hover:bg-[#8E9A7D]/10 transition-colors"
            >
              <RefreshCw size={16} />
              Analyze Another Collaboration
            </button>
          </div>

          {createdReportId && (
            <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-xs text-green-800 flex items-center justify-between">
              <span>Sponsorship Audit Report created successfully (ID: {createdReportId})</span>
              <a href="/dashboard/reports" className="font-bold underline flex items-center gap-1 hover:text-green-900">
                View Reports <ExternalLink size={12} />
              </a>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
