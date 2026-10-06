import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useErrorLogs } from '../context/ErrorLogContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ShieldCheck,
  Instagram,
  Image as ImageIcon,
  Type,
  Globe,
  FileText,
  Layers,
  Upload,
  Link as LinkIcon,
  CheckCircle,
  AlertTriangle,
  Info,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  FileSpreadsheet,
  Eye,
  ChevronDown,
  ChevronUp,
  Award,
  Lock,
  Cpu,
  ExternalLink,
  Check,
  Loader2,
  Share2,
  Briefcase,
} from 'lucide-react';
import AnalysisLoader from '../components/common/AnalysisLoader';

export default function CreatorWorkspacePage() {
  const { showToast } = useErrorLogs();
  const navigate = useNavigate();

  // Mode Selection: 'package' | 'social_post' | 'brand_collaboration' | 'image' | 'caption' | 'website' | 'document'
  const [inputMode, setInputMode] = useState('package');

  // Form Inputs
  const [instagramUrl, setInstagramUrl] = useState('');
  const [captionText, setCaptionText] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadedFileId, setUploadedFileId] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedDocumentId, setUploadedDocumentId] = useState(null);
  const [uploadedDocName, setUploadedDocName] = useState('');

  // Instagram Fetch State
  const [fetchingInstagram, setFetchingInstagram] = useState(false);
  const [instagramData, setInstagramData] = useState(null);

  // Analysis Execution & Result State
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showFullAnalysisModal, setShowFullAnalysisModal] = useState(false);
  const [activeSectionTab, setActiveSectionTab] = useState('authenticity');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [createdReport, setCreatedReport] = useState(null);

  // Handle Instagram Link Fetch
  const handleFetchInstagram = async () => {
    if (!instagramUrl || !instagramUrl.trim()) {
      showToast('Please enter a valid Instagram post URL.', 'error');
      return;
    }

    setFetchingInstagram(true);
    try {
      const res = await api.post('/creator/instagram-fetch', { url: instagramUrl.trim() });
      if (res.data?.success && res.data?.data) {
        const post = res.data.data;
        setInstagramData(post);

        // Auto-populate fields if empty
        if (post.caption && !captionText) setCaptionText(post.caption);
        if (post.imageUrl && !imageUrl) setImageUrl(post.imageUrl);
        if (post.externalLink && !websiteUrl) setWebsiteUrl(post.externalLink);

        showToast(`Instagram post imported (@${post.author?.username || 'creator'})`, 'success');
      }
    } catch (err) {
      showToast(err.message || 'Failed to resolve Instagram post details.', 'error');
    } finally {
      setFetchingInstagram(false);
    }
  };

  // Handle File Upload for Image
  const handleFileUpload = async (e, type = 'image') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append(type === 'image' ? 'image' : 'file', file);

    try {
      showToast(`Uploading ${file.name}...`, 'info');
      const res = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success && res.data?.data) {
        const uploaded = res.data.data;
        if (type === 'image') {
          setUploadedFileId(uploaded._id);
          setUploadedFileName(file.name);
          if (uploaded.fileUrl) setImageUrl(uploaded.fileUrl);
        } else {
          setUploadedDocumentId(uploaded._id);
          setUploadedDocName(file.name);
        }
        showToast(`Uploaded ${file.name} successfully`, 'success');
      }
    } catch (err) {
      showToast(err.message || 'File upload failed.', 'error');
    }
  };

  // Submit Content Package for Unified Verification
  const handleAnalyzePackage = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);

    const payload = {
      mode: inputMode,
      imageFileId: uploadedFileId,
      imageUrl: imageUrl.trim() || null,
      caption: captionText.trim() || null,
      websiteUrl: websiteUrl.trim() || null,
      documentFileId: uploadedDocumentId,
      instagramUrl: instagramUrl.trim() || null,
    };

    try {
      const res = await api.post('/creator/package', payload);
      if (res.data?.success && res.data?.data) {
        setAnalysisResult(res.data.data);
        showToast(`Content Verification Complete! Score: ${res.data.data.contentTrustScore}/100`, 'success');
      }
    } catch (err) {
      showToast(err.message || 'Content verification pipeline failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Generate Verification Report Action
  const handleGenerateReport = async () => {
    if (!analysisResult) return;
    setGeneratingReport(true);
    try {
      const res = await api.post('/creator/report', {
        analysisId: analysisResult.analysisId,
        contentTrustScore: analysisResult.contentTrustScore,
        riskCategory: analysisResult.security === 'High Risk' ? 'high' : 'low',
        recommendations: analysisResult.sections?.recommendations?.items || [],
      });

      if (res.data?.success && res.data?.data) {
        setCreatedReport(res.data.data);
        showToast('Creator Verification Report generated successfully!', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Failed to generate verification report.', 'error');
    } finally {
      setGeneratingReport(false);
    }
  };

  // Reset Workflow Action
  const handleResetForm = () => {
    setAnalysisResult(null);
    setInstagramData(null);
    setInstagramUrl('');
    setCaptionText('');
    setWebsiteUrl('');
    setImageUrl('');
    setUploadedFileId(null);
    setUploadedFileName('');
    setUploadedDocumentId(null);
    setUploadedDocName('');
    setCreatedReport(null);
    showToast('Creator Workspace reset.', 'info');
  };

  const modeOptions = [
    { id: 'package', title: 'FULL CONTENT PACKAGE', icon: Layers, badge: 'RECOMMENDED', desc: 'Verify Image + Caption + Link + Document together' },
    { id: 'social_post', title: 'Social Post (Instagram)', icon: Instagram, desc: 'Paste Instagram post or reel link' },
    { id: 'brand_collaboration', title: 'Brand Collaboration', icon: Briefcase, badge: 'NEW', desc: 'Evaluate sponsorship pitch & agreement', link: '/dashboard/brand-collaboration' },
    { id: 'image', title: 'Image Only', icon: ImageIcon, desc: 'EXIF metadata & Error Level Analysis' },
    { id: 'caption', title: 'Caption / Text', icon: Type, desc: 'AI writing signals & phishing checks' },
    { id: 'website', title: 'Website / Link', icon: Globe, desc: 'SSL certificate & link safety check' },
    { id: 'document', title: 'Document / Reference', icon: FileText, desc: 'Document integrity & metadata scan' },
  ];

  const scoreColor = (score) => {
    if (score >= 80) return 'text-[#5B8C5A] bg-[#5B8C5A]/10 border-[#5B8C5A]/30';
    if (score >= 60) return 'text-[#D9A441] bg-[#D9A441]/10 border-[#D9A441]/30';
    return 'text-[#D96C6C] bg-[#D96C6C]/10 border-[#D96C6C]/30';
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E5E7EB]">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#8E9A7D] text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#2B2B2B] tracking-tight">Creator Workspace</h1>
              <p className="text-xs text-[#6B7280]">
                Unified multi-modal content verification workflow for creators, brands & influencers.
              </p>
            </div>
          </div>
        </div>

        {analysisResult && (
          <button
            onClick={handleResetForm}
            className="flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-xl bg-[#F8F7F4] hover:bg-[#F3F2EF] text-[#2B2B2B] border border-[#E5E7EB] transition-colors"
          >
            <RotateCcw className="w-4 h-4 stroke-[1.75]" />
            <span>Analyze Another Post</span>
          </button>
        )}
      </div>

      {/* Input Mode Selector */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-[#2B2B2B] uppercase tracking-wider flex items-center space-x-2">
          <span>Choose Verification Input Mode</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          {modeOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = inputMode === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => (opt.link ? navigate(opt.link) : setInputMode(opt.id))}
                className={`relative flex flex-col justify-between p-3.5 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'border-[#8E9A7D] bg-[#8E9A7D]/5 shadow-sm ring-1 ring-[#8E9A7D]'
                    : 'border-[#E5E7EB] bg-white hover:border-[#8E9A7D]/50 hover:bg-[#F8F7F4]/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-[#8E9A7D]' : 'text-[#6B7280]'}`} />
                    {opt.badge && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-[#8E9A7D] text-white tracking-wider">
                        {opt.badge}
                      </span>
                    )}
                  </div>
                  <h3 className={`text-xs font-bold ${isSelected ? 'text-[#2B2B2B]' : 'text-[#4B5563]'}`}>
                    {opt.title}
                  </h3>
                  <p className="text-[10px] text-[#9CA3AF] mt-1 line-clamp-2">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Input Form Section */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm space-y-6">
        <h2 className="text-sm font-bold text-[#2B2B2B] uppercase tracking-wider flex items-center space-x-2 border-b border-[#E5E7EB] pb-3">
          <Layers className="w-4 h-4 text-[#8E9A7D]" />
          <span>Configure Content Package Details</span>
        </h2>

        {/* Instagram URL Field */}
        {(inputMode === 'social_post' || inputMode === 'package') && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#4B5563] flex items-center space-x-1.5">
              <Instagram className="w-4 h-4 text-[#D96C6C]" />
              <span>Instagram Post or Reel URL (Optional Import)</span>
            </label>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <input
                  type="url"
                  placeholder="https://www.instagram.com/p/C9xL8mOP2kL/ or @creator_handle"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-xs focus:outline-none focus:border-[#8E9A7D] focus:ring-1 focus:ring-[#8E9A7D]"
                />
              </div>
              <button
                type="button"
                onClick={handleFetchInstagram}
                disabled={fetchingInstagram}
                className="px-4 py-2.5 bg-[#F8F7F4] hover:bg-[#F3F2EF] text-[#2B2B2B] text-xs font-semibold rounded-xl border border-[#E5E7EB] flex items-center space-x-2 transition-colors disabled:opacity-50"
              >
                {fetchingInstagram ? <Loader2 className="w-4 h-4 animate-spin text-[#8E9A7D]" /> : <Instagram className="w-4 h-4 text-[#D96C6C]" />}
                <span>Fetch Post</span>
              </button>
            </div>

            {/* Instagram Preview Card */}
            {instagramData && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-xl bg-[#F8F7F4] border border-[#E5E7EB] flex items-center space-x-4 mt-2"
              >
                {instagramData.imageUrl && (
                  <img
                    src={instagramData.imageUrl}
                    alt="Post Preview"
                    className="w-14 h-14 rounded-lg object-cover border border-[#E5E7EB]"
                  />
                )}
                <div className="flex-1 text-xs space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-[#2B2B2B]">@{instagramData.author?.username}</span>
                    {instagramData.author?.isVerified && (
                      <CheckCircle className="w-3.5 h-3.5 text-[#5B8C5A] fill-[#5B8C5A]/20" />
                    )}
                  </div>
                  <p className="text-[#6B7280] line-clamp-2">{instagramData.caption}</p>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Multi-Column Layout for Image, Caption, Link & Document */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Image Upload & Link */}
          {(inputMode === 'package' || inputMode === 'image' || inputMode === 'social_post') && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#4B5563] flex items-center space-x-1.5">
                  <ImageIcon className="w-4 h-4 text-[#8E9A7D]" />
                  <span>Upload Image File for Forensics</span>
                </label>
                <div className="border-2 border-dashed border-[#E5E7EB] hover:border-[#8E9A7D] rounded-xl p-4 text-center transition-colors bg-[#F8F7F4]/50">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'image')}
                    className="hidden"
                    id="image-upload-input"
                  />
                  <label htmlFor="image-upload-input" className="cursor-pointer flex flex-col items-center space-y-1">
                    <Upload className="w-5 h-5 text-[#8E9A7D]" />
                    <span className="text-xs font-semibold text-[#2B2B2B]">
                      {uploadedFileName ? uploadedFileName : 'Drop photo here or click to browse'}
                    </span>
                    <span className="text-[10px] text-[#9CA3AF]">Supports JPG, PNG, WEBP (EXIF & ELA metadata scan)</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#4B5563] flex items-center space-x-1.5">
                  <LinkIcon className="w-4 h-4 text-[#8E9A7D]" />
                  <span>Image Direct URL (Optional)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E5E7EB] text-xs focus:outline-none focus:border-[#8E9A7D]"
                />
              </div>
            </div>
          )}

          {/* Right Column: Caption Text & External Link */}
          {(inputMode === 'package' || inputMode === 'caption' || inputMode === 'social_post' || inputMode === 'website') && (
            <div className="space-y-4">
              {(inputMode === 'package' || inputMode === 'caption' || inputMode === 'social_post') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#4B5563] flex items-center space-x-1.5">
                      <Type className="w-4 h-4 text-[#8E9A7D]" />
                      <span>Post Caption & Text Content</span>
                    </label>
                    <span className="text-[10px] text-[#9CA3AF]">{captionText.length} characters</span>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Enter your post caption, promotional details, or announcement text here..."
                    value={captionText}
                    onChange={(e) => setCaptionText(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-xs focus:outline-none focus:border-[#8E9A7D] focus:ring-1 focus:ring-[#8E9A7D]"
                  />
                </div>
              )}

              {(inputMode === 'package' || inputMode === 'website' || inputMode === 'social_post') && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#4B5563] flex items-center space-x-1.5">
                    <Globe className="w-4 h-4 text-[#8E9A7D]" />
                    <span>External Link / Bio URL</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://brand-promo-site.com/offer"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#E5E7EB] text-xs focus:outline-none focus:border-[#8E9A7D]"
                  />
                </div>
              )}
            </div>
          )}

          {/* Document Upload Row */}
          {(inputMode === 'package' || inputMode === 'document') && (
            <div className="md:col-span-2 space-y-2 border-t border-[#E5E7EB] pt-4">
              <label className="text-xs font-semibold text-[#4B5563] flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-[#8E9A7D]" />
                <span>Reference Document (Optional PDF / DOCX)</span>
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={(e) => handleFileUpload(e, 'document')}
                  className="hidden"
                  id="doc-upload-input"
                />
                <label
                  htmlFor="doc-upload-input"
                  className="px-4 py-2 bg-[#F8F7F4] hover:bg-[#F3F2EF] text-[#2B2B2B] text-xs font-semibold rounded-xl border border-[#E5E7EB] cursor-pointer flex items-center space-x-2"
                >
                  <Upload className="w-4 h-4 text-[#8E9A7D]" />
                  <span>{uploadedDocName ? uploadedDocName : 'Attach Document'}</span>
                </label>
                {uploadedDocName && (
                  <span className="text-xs text-[#5B8C5A] flex items-center space-x-1 font-medium">
                    <Check className="w-3.5 h-3.5" />
                    <span>Document Attached</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-[#E5E7EB] flex justify-end">
          <button
            type="button"
            onClick={handleAnalyzePackage}
            disabled={loading}
            className="px-6 py-3 bg-[#8E9A7D] hover:bg-[#7F8F73] text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Content Package...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 stroke-[2]" />
                <span>Verify Entire Content Package</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading State Display */}
      {loading && (
        <AnalysisLoader
          message="Verifying Content Package..."
          subMessage="TrustGraph is executing multi-modal forensic, text, link, and document verification."
        />
      )}

      {/* UNIFIED RESULTS PAGE SECTION */}
      {!loading && analysisResult && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Result Header & Gauge Card */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-[#E5E7EB] pb-6">
              {/* Score Display */}
              <div className="flex items-center space-x-5">
                <div className={`w-20 h-20 rounded-2xl border-2 flex flex-col items-center justify-center font-black ${scoreColor(analysisResult.contentTrustScore)}`}>
                  <span className="text-2xl tracking-tight">{analysisResult.contentTrustScore}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">/ 100</span>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-bold text-[#2B2B2B]">CONTENT TRUST SCORE</h2>
                    <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${scoreColor(analysisResult.contentTrustScore)}`}>
                      {analysisResult.contentTrustScore >= 80 ? 'Verified Safe' : analysisResult.contentTrustScore >= 60 ? 'Needs Caution' : 'High Risk'}
                    </span>
                  </div>
                  <p className="text-xs text-[#6B7280] mt-1">
                    Multi-modal verification complete. Statistically calibrated with {(analysisResult.confidenceScore * 100).toFixed(0)}% confidence.
                  </p>
                </div>
              </div>

              {/* Creator Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowFullAnalysisModal(true)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#F8F7F4] hover:bg-[#F3F2EF] text-[#2B2B2B] border border-[#E5E7EB] flex items-center space-x-1.5 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-[#8E9A7D]" />
                  <span>View Full Analysis</span>
                </button>
                <button
                  onClick={handleGenerateReport}
                  disabled={generatingReport}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#8E9A7D] hover:bg-[#7F8F73] text-white flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                >
                  {generatingReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                  <span>Generate Verification Report</span>
                </button>
                <button
                  onClick={() => showToast('Saved to Audit History', 'success')}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white hover:bg-[#F8F7F4] text-[#4B5563] border border-[#E5E7EB] flex items-center space-x-1.5 transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-[#5B8C5A]" />
                  <span>Save to History</span>
                </button>
              </div>
            </div>

            {/* Key Creator Metrics Badges Bar */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="p-3.5 rounded-xl bg-[#F8F7F4] border border-[#E5E7EB] space-y-1">
                <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">AUTHENTICITY</span>
                <div className="text-sm font-black text-[#2B2B2B]">{analysisResult.authenticity}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8F7F4] border border-[#E5E7EB] space-y-1">
                <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">SECURITY</span>
                <div className="text-sm font-black text-[#2B2B2B]">{analysisResult.security}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8F7F4] border border-[#E5E7EB] space-y-1">
                <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">AI SIGNAL</span>
                <div className="text-sm font-black text-[#2B2B2B]">{analysisResult.aiGenerationSignal}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8F7F4] border border-[#E5E7EB] space-y-1">
                <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">LINK SAFETY</span>
                <div className="text-sm font-black text-[#2B2B2B]">{analysisResult.linkSafety}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8F7F4] border border-[#E5E7EB] space-y-1">
                <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">CONTENT RISKS</span>
                <div className="text-sm font-black text-[#D96C6C]">{analysisResult.contentRisksCount} findings</div>
              </div>
            </div>
          </div>

          {/* Section Evidence Tabs & Accordions */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <div className="flex space-x-1 overflow-x-auto">
                {['authenticity', 'security', 'aiContentSignals', 'imageForensics', 'textAnalysis', 'linkSafety', 'recommendations'].map((tabKey) => {
                  const titleMap = {
                    authenticity: 'AUTHENTICITY',
                    security: 'SECURITY',
                    aiContentSignals: 'AI SIGNALS',
                    imageForensics: 'IMAGE FORENSICS',
                    textAnalysis: 'TEXT ANALYSIS',
                    linkSafety: 'LINK SAFETY',
                    recommendations: 'RECOMMENDATIONS',
                  };
                  const isActive = activeSectionTab === tabKey;
                  return (
                    <button
                      key={tabKey}
                      onClick={() => setActiveSectionTab(tabKey)}
                      className={`px-3 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                        isActive
                          ? 'bg-[#8E9A7D] text-white shadow-sm'
                          : 'text-[#6B7280] hover:text-[#2B2B2B] hover:bg-[#F3F2EF]'
                      }`}
                    >
                      {titleMap[tabKey]}
                    </button>
                  );
                })}
              </div>

              {/* Technical Details Toggle */}
              <button
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                className="text-xs font-semibold text-[#8E9A7D] hover:underline flex items-center space-x-1"
              >
                <span>{showTechnicalDetails ? 'Hide Technical Evidence' : 'Show Technical Evidence'}</span>
                {showTechnicalDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Tab Content Display */}
            {activeSectionTab === 'recommendations' ? (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#2B2B2B] uppercase tracking-wider">Creator Recommendations</h3>
                <ul className="space-y-2">
                  {(analysisResult.sections?.recommendations?.items || []).map((rec, i) => (
                    <li key={i} className="flex items-start space-x-2.5 p-3 rounded-xl bg-[#F8F7F4] border border-[#E5E7EB] text-xs text-[#2B2B2B]">
                      <Sparkles className="w-4 h-4 text-[#8E9A7D] flex-shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="space-y-4">
                {analysisResult.sections?.[activeSectionTab] && (
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xs font-bold text-[#2B2B2B] uppercase tracking-wider">
                        {analysisResult.sections[activeSectionTab].title}
                      </h3>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#F8F7F4] border border-[#E5E7EB] text-[#4B5563]">
                        {analysisResult.sections[activeSectionTab].status}
                      </span>
                    </div>

                    <p className="text-xs text-[#4B5563] bg-[#F8F7F4] p-3 rounded-xl border border-[#E5E7EB] mb-4">
                      {analysisResult.sections[activeSectionTab].summary}
                    </p>

                    <h4 className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">Verified Evidence</h4>
                    <div className="space-y-2">
                      {(analysisResult.sections[activeSectionTab].evidence || []).map((ev, i) => (
                        <div key={i} className="flex items-center space-x-2 text-xs text-[#2B2B2B] p-2.5 rounded-lg border border-[#E5E7EB] bg-white">
                          <CheckCircle className="w-4 h-4 text-[#5B8C5A] flex-shrink-0" />
                          <span>{ev}</span>
                        </div>
                      ))}
                    </div>

                    {/* Technical Evidence Accordion / Section */}
                    {showTechnicalDetails && analysisResult.sections[activeSectionTab].technicalEvidence && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4 p-4 rounded-xl bg-[#2B2B2B] text-white space-y-2 font-mono text-[11px]"
                      >
                        <span className="text-[#8E9A7D] font-bold uppercase tracking-wider block text-[10px]">Technical Evidence Log</span>
                        <pre className="overflow-x-auto text-[#E5E7EB]">
                          {JSON.stringify(analysisResult.sections[activeSectionTab].technicalEvidence, null, 2)}
                        </pre>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Full Analysis Detail Modal */}
      {showFullAnalysisModal && analysisResult && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl border border-[#E5E7EB] max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <h3 className="text-sm font-bold text-[#2B2B2B] uppercase tracking-wider">Full Technical Forensic Analysis</h3>
              <button
                onClick={() => setShowFullAnalysisModal(false)}
                className="p-1 rounded-lg text-[#9CA3AF] hover:text-[#2B2B2B] hover:bg-[#F8F7F4]"
              >
                ✕
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-[#F8F7F4] border border-[#E5E7EB] text-[11px] font-mono text-[#2B2B2B] overflow-x-auto">
              {JSON.stringify(analysisResult, null, 2)}
            </pre>
            <div className="flex justify-end">
              <button
                onClick={() => setShowFullAnalysisModal(false)}
                className="px-4 py-2 bg-[#8E9A7D] text-white text-xs font-bold rounded-xl"
              >
                Close Modal
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
