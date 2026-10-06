import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AnalysisLoader from '../components/common/AnalysisLoader';
import {
  Instagram,
  Link2,
  Shield,
  AlertTriangle,
  CheckCircle,
  Info,
  ExternalLink,
  Unlink,
  RefreshCw,
  Image,
  FileText,
  Activity,
  ChevronDown,
  ChevronUp,
  Upload,
  Loader2,
  AlertCircle,
  Wifi,
  WifiOff,
  Eye,
  EyeOff,
} from 'lucide-react';
import api from '../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const SCORE_COLOR = (score) => {
  if (score >= 75) return '#8E9A7D';
  if (score >= 50) return '#D9A441';
  return '#D96C6C';
};

const SCORE_LABEL = (score) => {
  if (score >= 80) return 'High';
  if (score >= 60) return 'Moderate';
  if (score >= 40) return 'Low';
  return 'Very Low';
};

const Badge = ({ label, value, color }) => (
  <div className="flex flex-col items-center gap-1 p-3 rounded-lg border" style={{ borderColor: color + '40', background: color + '12' }}>
    <span className="text-xs text-gray-500 font-medium">{label}</span>
    <span className="text-sm font-semibold" style={{ color }}>{value}</span>
  </div>
);

const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-start gap-3 mb-3">
    <div className="p-2 rounded-lg bg-gray-100">
      <Icon size={16} className="text-gray-600" />
    </div>
    <div>
      <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ConnectSection({ configStatus, connectionStatus, onConnect, onDisconnect, loading }) {
  const isLiveConfigured = configStatus?.configured;
  const isConnected = connectionStatus?.connected;

  return (
    <div className="space-y-4">
      {/* API Status Banner */}
      <div
        className="flex items-start gap-3 p-4 rounded-xl border text-sm"
        style={{
          background: isLiveConfigured ? '#8E9A7D12' : '#D9A44112',
          borderColor: isLiveConfigured ? '#8E9A7D40' : '#D9A44140',
        }}
      >
        {isLiveConfigured ? (
          <Wifi size={16} className="mt-0.5 text-green-600 shrink-0" />
        ) : (
          <WifiOff size={16} className="mt-0.5 text-yellow-600 shrink-0" />
        )}
        <div>
          <p className="font-semibold" style={{ color: isLiveConfigured ? '#8E9A7D' : '#D9A441' }}>
            {isLiveConfigured ? 'Instagram Graph API — Configured' : 'Instagram Graph API — Not Configured'}
          </p>
          <p className="text-gray-600 mt-1 text-xs">
            {isLiveConfigured
              ? 'Live API access is enabled. Connect your Instagram Professional account below.'
              : 'INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET are not set. You can still use Manual Import mode to analyze Instagram content.'}
          </p>
        </div>
      </div>

      {/* Connected Account Card */}
      {isConnected ? (
        <div className="p-4 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                <Instagram size={18} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">@{connectionStatus.username || 'connected'}</p>
                <p className="text-xs text-gray-500">
                  {connectionStatus.daysUntilExpiry !== null
                    ? `Token expires in ${connectionStatus.daysUntilExpiry} days`
                    : 'Connected'}
                </p>
              </div>
            </div>
            <button
              onClick={onDisconnect}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Unlink size={13} />
              Disconnect
            </button>
          </div>
          {connectionStatus.tokenWarning && (
            <div className="mt-3 flex items-center gap-2 text-xs text-yellow-700 bg-yellow-50 px-3 py-2 rounded-lg">
              <AlertTriangle size={12} />
              Your Instagram token expires soon. Reconnect to avoid interruptions.
            </div>
          )}
        </div>
      ) : isLiveConfigured ? (
        <button
          onClick={onConnect}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-white text-sm transition-all"
          style={{ background: 'linear-gradient(135deg, #833AB4, #FD1D1D, #F77737)' }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Instagram size={16} />}
          Connect Instagram Professional Account
        </button>
      ) : null}

      {/* Manual Import notice */}
      {!isLiveConfigured && (
        <div className="p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 text-center">
          <Upload size={20} className="mx-auto text-gray-400 mb-2" />
          <p className="text-sm font-medium text-gray-700">Manual Content Import</p>
          <p className="text-xs text-gray-500 mt-1">
            Provide your Instagram content below to analyze it through TrustGraph.
            This is <strong>not</strong> a live Instagram API connection.
          </p>
        </div>
      )}
    </div>
  );
}

function MediaGrid({ media, onSelect, selectedId }) {
  if (!media?.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {media.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item)}
          className={`relative rounded-xl overflow-hidden border-2 transition-all text-left ${
            selectedId === item.id ? 'border-[#8E9A7D] ring-2 ring-[#8E9A7D40]' : 'border-transparent hover:border-gray-300'
          }`}
        >
          {item.mediaUrl ? (
            <img
              src={item.mediaUrl}
              alt={item.caption?.substring(0, 30) || 'Instagram post'}
              className="w-full aspect-square object-cover"
            />
          ) : (
            <div className="w-full aspect-square bg-gray-100 flex items-center justify-center">
              <Image size={24} className="text-gray-400" />
            </div>
          )}
          <div className="p-2">
            <p className="text-xs text-gray-600 line-clamp-2">{item.caption || 'No caption'}</p>
            <p className="text-xs text-gray-400 mt-1">{item.mediaType}</p>
          </div>
          {selectedId === item.id && (
            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#8E9A7D] flex items-center justify-center">
              <CheckCircle size={12} className="text-white" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

function AnalysisResult({ result, onReset }) {
  const [showTechnical, setShowTechnical] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const score = result?.contentTrustScore ?? result?.overallTrustScore ?? 0;
  const scoreColor = SCORE_COLOR(score);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'image', label: 'Image' },
    { id: 'caption', label: 'Caption' },
    { id: 'link', label: 'Link Safety' },
    { id: 'recommendations', label: 'Actions' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Score hero */}
      <div className="text-center py-6 px-4 rounded-2xl border" style={{ borderColor: scoreColor + '40', background: scoreColor + '0D' }}>
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Instagram Content Trust Score</p>
        <div className="text-6xl font-black" style={{ color: scoreColor }}>{score}</div>
        <div className="text-sm text-gray-500 mt-1">/ 100</div>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <Badge label="Authenticity" value={SCORE_LABEL(result?.authenticity?.score ?? score)} color={SCORE_COLOR(result?.authenticity?.score ?? score)} />
          <Badge label="AI Signals" value={result?.aiSignals?.classification || 'Low'} color={SCORE_COLOR(result?.aiSignals?.score ?? 70)} />
          <Badge label="Link Safety" value={result?.linkSafety?.label || 'Safe'} color={result?.linkSafety?.safe ? '#8E9A7D' : '#D96C6C'} />
          <Badge label="Security" value={result?.security?.riskLevel || 'Low Risk'} color={result?.security?.riskScore < 40 ? '#8E9A7D' : '#D96C6C'} />
        </div>
      </div>

      {/* Instagram source info */}
      {result?.instagramSource && (
        <div className="flex items-center gap-2 text-xs text-gray-500 px-1">
          <Instagram size={12} className="text-pink-500" />
          <span>
            Source: {result.instagramSource.source === 'instagram_graph_api' ? 'Instagram Graph API (live)' : 'Manual Import'}
          </span>
          {result.instagramSource.permalink && (
            <a href={result.instagramSource.permalink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
              <ExternalLink size={10} /> View post
            </a>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 pb-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === t.id
                ? 'border-[#8E9A7D] text-[#8E9A7D]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          {activeTab === 'overview' && (
            <div className="space-y-3">
              {result?.summary?.findings?.map((finding, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg text-sm border ${
                  finding.severity === 'high' ? 'bg-red-50 border-red-200' :
                  finding.severity === 'medium' ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'
                }`}>
                  {finding.severity === 'high' ? <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" /> :
                   finding.severity === 'medium' ? <Info size={14} className="text-yellow-600 mt-0.5 shrink-0" /> :
                   <CheckCircle size={14} className="text-green-600 mt-0.5 shrink-0" />}
                  <p className="text-gray-700">{finding.message}</p>
                </div>
              )) || (
                <p className="text-sm text-gray-500 text-center py-4">No specific findings to display.</p>
              )}
            </div>
          )}

          {activeTab === 'image' && (
            <div className="space-y-3">
              {result?.imageAnalysis ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                      <p className="text-xs text-gray-500">Trust Score</p>
                      <p className="text-lg font-bold" style={{ color: SCORE_COLOR(result.imageAnalysis.trustScore ?? 0) }}>
                        {result.imageAnalysis.trustScore ?? 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                      <p className="text-xs text-gray-500">AI Detection</p>
                      <p className="text-sm font-semibold text-gray-700">
                        {result.imageAnalysis.aiGenerated ? 'AI-generated signals detected' : 'No strong AI signals'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowTechnical(!showTechnical)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    {showTechnical ? <EyeOff size={12} /> : <Eye size={12} />}
                    {showTechnical ? 'Hide' : 'Show'} technical evidence
                  </button>
                  {showTechnical && (
                    <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto">
                      {JSON.stringify(result.imageAnalysis, null, 2)}
                    </pre>
                  )}
                </>
              ) : (
                <div className="p-6 text-center text-gray-400 text-sm">
                  <Image size={24} className="mx-auto mb-2" />
                  No image was analyzed. Provide an image URL or upload an image.
                </div>
              )}
            </div>
          )}

          {activeTab === 'caption' && (
            <div className="space-y-3">
              {result?.textAnalysis ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                      <p className="text-xs text-gray-500">AI Writing Signals</p>
                      <p className="text-sm font-semibold text-gray-700">
                        {result.textAnalysis.aiLikelihood > 0.6
                          ? 'Strong AI-generated writing signals detected'
                          : result.textAnalysis.aiLikelihood > 0.35
                          ? 'Moderate AI writing signals'
                          : 'Likely human-written'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                      <p className="text-xs text-gray-500">Social Engineering</p>
                      <p className="text-sm font-semibold text-gray-700">
                        {result.textAnalysis.socialEngineering?.likelihood > 0.5
                          ? 'Manipulation patterns detected'
                          : 'No manipulation patterns'}
                      </p>
                    </div>
                  </div>
                  {result.textAnalysis.signals?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Detected signals:</p>
                      <div className="flex flex-wrap gap-2">
                        {result.textAnalysis.signals.map((s, i) => (
                          <span key={i} className="text-xs px-2 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-6 text-center text-gray-400 text-sm">
                  <FileText size={24} className="mx-auto mb-2" />
                  No caption was analyzed.
                </div>
              )}
            </div>
          )}

          {activeTab === 'link' && (
            <div className="space-y-3">
              {result?.websiteAnalysis ? (
                <>
                  <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                    result.websiteAnalysis.safe ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                    {result.websiteAnalysis.safe
                      ? <CheckCircle size={18} className="text-green-600 mt-0.5 shrink-0" />
                      : <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />}
                    <div>
                      <p className="font-semibold text-sm text-gray-800">
                        {result.websiteAnalysis.safe ? 'Link appears safe' : 'Potential link safety concern'}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">{result.websiteAnalysis.summary}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-6 text-center text-gray-400 text-sm">
                  <Link2 size={24} className="mx-auto mb-2" />
                  No external link was analyzed.
                </div>
              )}
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="space-y-3">
              {result?.recommendations?.length > 0 ? (
                result.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm">
                    <Info size={14} className="text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-gray-700">{rec}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No additional recommendations.</p>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
        <button
          onClick={onReset}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={14} />
          Analyze Another
        </button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function InstagramAnalyzerPage() {
  const [configStatus, setConfigStatus] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [media, setMedia] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('connect'); // 'connect' | 'select' | 'manual' | 'result'

  // Manual import form state
  const [manualCaption, setManualCaption] = useState('');
  const [manualLink, setManualLink] = useState('');
  const [manualImageUrl, setManualImageUrl] = useState('');

  // ── Load config + connection status on mount ────────────────────────
  const loadStatus = useCallback(async () => {
    try {
      const [configRes, statusRes] = await Promise.all([
        api.get('/instagram/config').catch(() => ({ data: { data: {} } })),
        api.get('/instagram/status').catch(() => ({ data: { data: {} } })),
      ]);
      setConfigStatus(configRes.data.data);
      setConnectionStatus(statusRes.data.data);
    } catch {
      // Non-fatal
    }
  }, []);

  useEffect(() => {
    loadStatus();
    // Handle redirect from OAuth callback
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'true') {
      loadStatus();
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('connected') === 'false') {
      setError(params.get('error') || 'Instagram connection failed.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [loadStatus]);

  // ── Fetch user's Instagram media ───────────────────────────────────
  const loadMedia = async () => {
    setMediaLoading(true);
    setError('');
    try {
      const res = await api.get('/instagram/media?limit=12');
      setMedia(res.data.data.media || []);
      setMode('select');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load Instagram media.');
    } finally {
      setMediaLoading(false);
    }
  };

  // ── Connect flow (OAuth redirect) ──────────────────────────────────
  const handleConnect = async () => {
    setLoading(true);
    setError('');
    try {
      // Authenticated call sends Authorization: Bearer <jwt_token> header automatically
      const res = await api.get('/instagram/connect');
      const authUrl = res.data?.data?.authorizationUrl || res.data?.data?.url;
      if (authUrl) {
        window.location.href = authUrl;
      } else {
        setError('Failed to obtain Meta OAuth authorization URL.');
        setLoading(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initiate Instagram OAuth connection.');
      setLoading(false);
    }
  };

  // ── Disconnect ────────────────────────────────────────────────────
  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect your Instagram account from TrustGraph?')) return;
    setLoading(true);
    try {
      await api.delete('/instagram/disconnect');
      setConnectionStatus(null);
      setMedia([]);
      setSelectedMedia(null);
      setMode('connect');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to disconnect.');
    } finally {
      setLoading(false);
    }
  };

  // ── Analyze selected or manual content ────────────────────────────
  const handleAnalyze = async () => {
    setAnalyzing(true);
    setResult(null);
    setError('');
    try {
      const payload = selectedMedia
        ? { mediaId: selectedMedia.id, source: 'live' }
        : {
            caption: manualCaption,
            externalLink: manualLink,
            mediaUrl: manualImageUrl,
            source: 'manual',
          };

      const res = await api.post('/instagram/analyze', payload);
      setResult(res.data.data);
      setMode('result');
    } catch (err) {
      setError(err.response?.data?.message || 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setSelectedMedia(null);
    setManualCaption('');
    setManualLink('');
    setManualImageUrl('');
    setMode(connectionStatus?.connected ? 'select' : 'connect');
  };

  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg, #833AB420, #FD1D1D10)' }}>
          <Instagram size={22} className="text-pink-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Instagram Content Analyzer</h1>
          <p className="text-sm text-gray-500">Verify your Instagram content before publishing</p>
        </div>
      </div>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-sm"
          >
            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-red-700">{error}</p>
            </div>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 text-xs">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analysis Loader */}
      {analyzing && (
        <AnalysisLoader
          message="Analyzing Instagram Content..."
          subMessage="Inspecting image forensics, caption writing signals, link safety, and content trust score..."
        />
      )}

      {/* Result view */}
      {!analyzing && mode === 'result' && result && (
        <AnalysisResult result={result} onReset={handleReset} />
      )}

      {/* Main content */}
      {!analyzing && mode !== 'result' && (
        <div className="space-y-5">
          {/* Step 1: Connection */}
          <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader icon={Instagram} title="Instagram Connection" subtitle="Connect your Instagram Professional account or use Manual Import" />
            <ConnectSection
              configStatus={configStatus}
              connectionStatus={connectionStatus}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              loading={loading}
            />
          </div>

          {/* Step 2: Media Selection (if connected) */}
          {connectionStatus?.connected && (
            <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-sm">
              <SectionHeader icon={Image} title="Select a Post to Analyze" subtitle="Choose from your recent Instagram posts" />
              {media.length === 0 ? (
                <button
                  onClick={loadMedia}
                  disabled={mediaLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-gray-300 text-gray-600 hover:border-[#8E9A7D] hover:text-[#8E9A7D] transition-colors text-sm font-medium"
                >
                  {mediaLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  {mediaLoading ? 'Loading posts…' : 'Load Recent Posts'}
                </button>
              ) : (
                <MediaGrid media={media} onSelect={setSelectedMedia} selectedId={selectedMedia?.id} />
              )}
            </div>
          )}

          {/* Step 3: Manual Import (always available) */}
          <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <SectionHeader
                icon={Upload}
                title="Manual Content Import"
                subtitle={connectionStatus?.connected ? 'Or manually provide content to analyze' : 'Provide your Instagram content below'}
              />
              {!connectionStatus?.connected && (
                <span className="text-xs px-2 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
                  Demo Mode
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Caption / Text</label>
                <textarea
                  value={manualCaption}
                  onChange={(e) => { setManualCaption(e.target.value); setSelectedMedia(null); }}
                  rows={3}
                  placeholder="Paste your Instagram caption here…"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-[#8E9A7D] resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">External Link</label>
                <input
                  type="url"
                  value={manualLink}
                  onChange={(e) => { setManualLink(e.target.value); setSelectedMedia(null); }}
                  placeholder="https://example.com/your-link"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-[#8E9A7D]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Image URL (optional)</label>
                <input
                  type="url"
                  value={manualImageUrl}
                  onChange={(e) => { setManualImageUrl(e.target.value); setSelectedMedia(null); }}
                  placeholder="https://… (direct image URL)"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-[#8E9A7D]"
                />
              </div>
            </div>
          </div>

          {/* Analyze button */}
          <button
            onClick={handleAnalyze}
            disabled={analyzing || (!selectedMedia && !manualCaption && !manualLink && !manualImageUrl)}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: '#8E9A7D' }}
          >
            {analyzing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Analyzing content…
              </>
            ) : (
              <>
                <Activity size={16} />
                {selectedMedia ? 'Analyze Selected Post' : 'Analyze Content'}
              </>
            )}
          </button>

          {/* What gets analyzed note */}
          <div className="flex items-start gap-2 text-xs text-gray-500">
            <Shield size={12} className="mt-0.5 shrink-0 text-[#8E9A7D]" />
            <p>
              TrustGraph will check image authenticity, caption AI signals, link safety, and overall trust — reusing
              the same analysis engines as the rest of the platform.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
