import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  Shield,
  AlertTriangle,
  FileText,
  CheckCircle,
  Globe,
  Image as ImageIcon,
  Type,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  ExternalLink,
  Award,
  Sparkles,
  Instagram,
  ShieldCheck,
  AlertCircle,
  Eye,
  Clock,
  Zap,
  Briefcase,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { role, hasRole } = useAuth();

  // Mode selection: 'enterprise' | 'creator'
  const [dashboardMode, setDashboardMode] = useState(() => (role === 'CONTENT_CREATOR' ? 'creator' : 'enterprise'));

  useEffect(() => {
    if (role === 'CONTENT_CREATOR') {
      setDashboardMode('creator');
    } else if (role === 'INDUSTRY_ANALYST') {
      setDashboardMode('enterprise');
    }
  }, [role]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Enterprise Summary State
  const [summary, setSummary] = useState({
    totalAnalyses: 0,
    averageTrustScore: 0,
    averageConfidence: 0,
    filesProcessed: 0,
    riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
    modalityDistribution: { content: 0, domain: 0, user: 0, organization: 0 },
    recentAnalyses: [],
    trustScoreTrend: [],
    hasData: false,
  });

  // Creator Summary State
  const [creatorSummary, setCreatorSummary] = useState({
    totalCreatorPosts: 0,
    avgTrustScore: 0,
    highRiskCount: 0,
    aiSignalsCount: 0,
    unsafeLinksCount: 0,
    recentPosts: [],
    recentWarnings: [],
    trend: [],
    hasCreatorData: false,
  });

  const [healthStatus, setHealthStatus] = useState('connected');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const canFetchEnterprise = role === 'ADMIN' || role === 'INDUSTRY_ANALYST' || !role;
        const canFetchCreator = role === 'ADMIN' || role === 'CONTENT_CREATOR';

        const promises = [
          api.get('/health'),
          canFetchEnterprise ? api.get('/dashboard/summary') : Promise.resolve({ data: { data: null } }),
          canFetchCreator ? api.get('/dashboard/creator-summary') : Promise.resolve({ data: { data: null } }),
        ];

        const results = await Promise.allSettled(promises);
        const healthRes = results[0];
        const summaryRes = results[1];
        const creatorRes = results[2];

        if (healthRes.status === 'fulfilled' && healthRes.value?.data) {
          setHealthStatus(healthRes.value.data.database || 'connected');
        }

        if (summaryRes.status === 'fulfilled' && summaryRes.value?.data?.data) {
          setSummary(summaryRes.value.data.data);
        }

        if (creatorRes.status === 'fulfilled' && creatorRes.value?.data?.data) {
          setCreatorSummary(creatorRes.value.data.data);
        }
      } catch (err) {
        setError(err.message || 'Failed to load dashboard metrics.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [role]);

  const totalThreats = summary.riskDistribution.critical + summary.riskDistribution.high;

  // Enterprise KPI Cards
  const kpiCards = [
    {
      title: 'TOTAL ANALYSES RUN',
      value: summary.totalAnalyses.toLocaleString(),
      subtitle: summary.hasData ? `${summary.totalAnalyses} records in database` : 'No analyses run yet',
      icon: TrendingUp,
      accentBg: 'bg-[#8E9A7D]/10 text-[#7F8F73]',
    },
    {
      title: 'AVERAGE TRUST SCORE',
      value: summary.hasData ? `${summary.averageTrustScore}%` : 'N/A',
      subtitle: summary.hasData ? `Confidence: ${(summary.averageConfidence * 100).toFixed(0)}%` : 'Awaiting initial scan',
      icon: Shield,
      accentBg: 'bg-[#5B8C5A]/10 text-[#5B8C5A]',
    },
    {
      title: 'THREATS FLAGGED',
      value: totalThreats,
      subtitle: `${summary.riskDistribution.critical} critical, ${summary.riskDistribution.high} high risk`,
      icon: AlertTriangle,
      accentBg: 'bg-[#D96C6C]/10 text-[#D96C6C]',
    },
    {
      title: 'FILES PROCESSED',
      value: summary.filesProcessed,
      subtitle: 'Uploaded file records',
      icon: FileText,
      accentBg: 'bg-[#D9A441]/10 text-[#D9A441]',
    },
  ];

  // Format Date Helper
  const formatDateLabel = (dateStr) => {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.abs(now - date) / 36e5;
    if (diffHours < 24) return 'Today';
    if (diffHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header & Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#2B2B2B] tracking-tight flex items-center gap-2">
            {dashboardMode === 'creator' ? 'Creator Trust Dashboard' : 'Enterprise Security Dashboard'}
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            {dashboardMode === 'creator'
              ? 'Monitor the authenticity, safety and trustworthiness of your published content.'
              : 'Real-time digital trust telemetry, multi-modal threat analysis, and AI risk monitoring.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Switcher Buttons */}
          <div className="bg-[#F3F2EF] p-1 rounded-xl flex items-center text-xs font-semibold border border-[#E5E7EB]">
            <button
              onClick={() => setDashboardMode('enterprise')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                dashboardMode === 'enterprise'
                  ? 'bg-white text-[#2B2B2B] shadow-xs'
                  : 'text-[#6B7280] hover:text-[#2B2B2B]'
              }`}
            >
              Enterprise Mode
            </button>
            <button
              onClick={() => setDashboardMode('creator')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                dashboardMode === 'creator'
                  ? 'bg-[#8E9A7D] text-white shadow-xs'
                  : 'text-[#6B7280] hover:text-[#2B2B2B]'
              }`}
            >
              <Sparkles size={13} />
              Creator Mode
            </button>
          </div>

          {/* Database Health Badge */}
          <div className="flex items-center space-x-2 bg-white border border-[#E5E7EB] px-3 py-1.5 rounded-xl shadow-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                healthStatus === 'connected' ? 'bg-[#5B8C5A] animate-pulse' : 'bg-[#D96C6C]'
              }`}
            />
            <div className="text-[11px] font-mono text-[#6B7280]">
              Cluster: <strong className="text-[#2B2B2B] capitalize">{healthStatus}</strong>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center space-y-3 bg-white rounded-2xl border border-[#E5E7EB] shadow-xs">
          <Loader2 className="w-8 h-8 text-[#8E9A7D] animate-spin mx-auto" />
          <p className="text-xs font-mono text-[#6B7280]">Loading live telemetry & analysis summary...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-[#D96C6C]/10 border border-[#D96C6C]/30 rounded-2xl text-xs text-[#D96C6C]">
          {error}
        </div>
      ) : dashboardMode === 'creator' ? (
        /* ─────────────────────────────────────────────────────────────
           CREATOR TRUST DASHBOARD VIEW
           ───────────────────────────────────────────────────────────── */
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          {/* Creator Top Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-2">
              <span className="text-[11px] font-bold text-[#9CA3AF] tracking-wider uppercase">Content Trust Score</span>
              <div className="text-3xl font-black text-[#8E9A7D]">
                {creatorSummary.hasCreatorData ? `${creatorSummary.avgTrustScore}%` : 'N/A'}
                {creatorSummary.hasCreatorData && <span className="text-xs font-normal text-gray-400 ml-1">avg</span>}
              </div>
              <p className="text-[11px] text-gray-500">Average content score</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-2">
              <span className="text-[11px] font-bold text-[#9CA3AF] tracking-wider uppercase">Posts Analyzed</span>
              <div className="text-3xl font-black text-[#2B2B2B]">
                {creatorSummary.totalCreatorPosts}
              </div>
              <p className="text-[11px] text-gray-500">Verified post submissions</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-2">
              <span className="text-[11px] font-bold text-[#9CA3AF] tracking-wider uppercase">High-Risk Content</span>
              <div className="text-3xl font-black text-[#D96C6C]">
                {creatorSummary.highRiskCount}
              </div>
              <p className="text-[11px] text-gray-500">Flagged posts requiring review</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-2">
              <span className="text-[11px] font-bold text-[#9CA3AF] tracking-wider uppercase">AI-Generated Signals</span>
              <div className="text-3xl font-black text-[#D9A441]">
                {creatorSummary.aiSignalsCount}
              </div>
              <p className="text-[11px] text-gray-500">Synthetic text or image cues</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-2">
              <span className="text-[11px] font-bold text-[#9CA3AF] tracking-wider uppercase">Unsafe Links</span>
              <div className="text-3xl font-black text-[#D96C6C]">
                {creatorSummary.unsafeLinksCount}
              </div>
              <p className="text-[11px] text-gray-500">Unsafe destination links</p>
            </div>
          </div>

          {/* Action Launcher Bar */}
          <div className="p-4 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold text-[#2B2B2B] px-2 flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#8E9A7D]" />
              Creator Quick Actions:
            </span>
            <div className="flex flex-wrap gap-2 text-xs">
              <NavLink
                to="/dashboard/post-verification"
                className="px-4 py-2 rounded-xl bg-[#8E9A7D] text-white font-semibold transition-colors flex items-center space-x-2 shadow-xs"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verify New Post</span>
              </NavLink>
              <NavLink
                to="/dashboard/brand-collaboration"
                className="px-4 py-2 rounded-xl bg-[#F8F7F4] border border-[#E5E7EB] text-[#2B2B2B] hover:bg-gray-100 font-semibold transition-colors flex items-center space-x-2"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Brand Collaboration</span>
              </NavLink>
              <NavLink
                to="/dashboard/instagram"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold transition-colors flex items-center space-x-2 shadow-xs"
              >
                <Instagram className="w-3.5 h-3.5" />
                <span>Connect Instagram</span>
              </NavLink>
              <NavLink
                to="/dashboard/reports"
                className="px-4 py-2 rounded-xl bg-[#F8F7F4] border border-[#E5E7EB] text-[#2B2B2B] hover:bg-gray-100 font-semibold transition-colors flex items-center space-x-2"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View Reports</span>
              </NavLink>
              <NavLink
                to="/dashboard/history"
                className="px-4 py-2 rounded-xl bg-[#F8F7F4] border border-[#E5E7EB] text-[#2B2B2B] hover:bg-gray-100 font-semibold transition-colors flex items-center space-x-2"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Content History</span>
              </NavLink>
            </div>
          </div>

          {/* Trend & Recent Warnings Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Content Trust Trend (7 / 30 Days) */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-6">
              <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-4">
                <div>
                  <h3 className="text-base font-bold text-[#2B2B2B]">Content Trust Trend</h3>
                  <p className="text-xs text-[#6B7280]">Rolling average post trust score trajectory (Last 7 / 30 Days)</p>
                </div>
                <span className="px-3 py-1 bg-[#8E9A7D]/10 text-[#8E9A7D] border border-[#8E9A7D]/30 text-xs font-semibold rounded-full">
                  7-Day Window
                </span>
              </div>

              {/* Wave SVG Graph */}
              <div className="h-48 w-full relative flex items-end">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150">
                  <defs>
                    <linearGradient id="creatorTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8E9A7D" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#8E9A7D" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0 90 Q 80 50 160 70 T 320 30 T 500 50 L 500 150 L 0 150 Z"
                    fill="url(#creatorTrendGrad)"
                  />
                  <path
                    d="M 0 90 Q 80 50 160 70 T 320 30 T 500 50"
                    fill="none"
                    stroke="#8E9A7D"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex justify-between items-end px-2 text-[11px] font-mono text-[#9CA3AF] pb-1">
                  {creatorSummary.trend.map((t) => (
                    <span key={t.date}>
                      {t.day} ({t.avgScore !== null ? `${t.avgScore}%` : 'N/A'})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Actionable Recent Warnings */}
            <div className="p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-4">
              <h3 className="text-base font-bold text-[#2B2B2B] border-b border-[#E5E7EB] pb-3 flex items-center gap-2">
                <AlertTriangle size={18} className="text-yellow-600" />
                Recent Content Warnings
              </h3>

              {creatorSummary.recentWarnings.length > 0 ? (
                <div className="space-y-3">
                  {creatorSummary.recentWarnings.map((warn, i) => (
                    <div key={i} className="p-3 rounded-xl bg-yellow-50/70 border border-yellow-200 text-xs text-yellow-800 font-medium flex items-start gap-2.5">
                      <AlertCircle size={14} className="text-yellow-600 mt-0.5 shrink-0" />
                      <span>{warn}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-500 text-center font-medium">
                  No active content warnings flagged.
                </div>
              )}
            </div>
          </div>

          {/* Recent Content Table */}
          <div className="p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#2B2B2B]">Recent Content</h3>
                <p className="text-xs text-[#6B7280]">Recent posts and content verified through TrustGraph</p>
              </div>
              <NavLink to="/dashboard/history" className="text-xs text-[#7F8F73] font-semibold hover:underline flex items-center space-x-1">
                <span>Full History</span>
                <ExternalLink className="w-3 h-3" />
              </NavLink>
            </div>

            {!creatorSummary.hasCreatorData ? (
              <div className="p-12 text-center text-[#9CA3AF] text-xs space-y-2">
                <p className="font-semibold text-gray-700">No creator content has been analyzed yet.</p>
                <p className="text-[11px] text-[#6B7280]">
                  Run your first post verification or connect Instagram to populate your content trust dashboard.
                </p>
                <div className="pt-2">
                  <NavLink
                    to="/dashboard/post-verification"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8E9A7D] text-white text-xs font-bold"
                  >
                    <ShieldCheck size={14} />
                    Verify New Post
                  </NavLink>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F7F4] text-[#6B7280] font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5 rounded-l-xl">Content</th>
                      <th className="p-3.5">Platform</th>
                      <th className="p-3.5">Trust Score</th>
                      <th className="p-3.5">Risk</th>
                      <th className="p-3.5">Analyzed</th>
                      <th className="p-3.5 rounded-r-xl">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {creatorSummary.recentPosts.map((post) => (
                      <tr key={post._id} className="hover:bg-[#F8F7F4] transition-colors">
                        <td className="p-3.5 text-[#2B2B2B] font-medium truncate max-w-xs">{post.targetEntity}</td>
                        <td className="p-3.5 text-[#6B7280] font-medium">
                          {post.targetEntity?.includes('instagram') ? 'Instagram' : 'Web / Post'}
                        </td>
                        <td className="p-3.5 font-bold text-[#2B2B2B]">{post.trustScore}%</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              post.riskCategory === 'critical' || post.riskCategory === 'high'
                                ? 'bg-[#D96C6C]/15 text-[#D96C6C] border border-[#D96C6C]/20'
                                : post.riskCategory === 'medium'
                                ? 'bg-[#D9A441]/15 text-[#D9A441] border border-[#D9A441]/20'
                                : 'bg-[#5B8C5A]/15 text-[#5B8C5A] border border-[#5B8C5A]/20'
                            }`}
                          >
                            {post.riskCategory || 'Low'}
                          </span>
                        </td>
                        <td className="p-3.5 text-[#9CA3AF]">{formatDateLabel(post.createdAt)}</td>
                        <td className="p-3.5">
                          <NavLink
                            to={`/dashboard/analysis/${post._id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#8E9A7D] hover:underline"
                          >
                            <Eye size={13} />
                            {post.riskCategory === 'high' || post.riskCategory === 'critical' ? 'Review' : 'View'}
                          </NavLink>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      ) : (
        /* ─────────────────────────────────────────────────────────────
           ENTERPRISE SECURITY DASHBOARD VIEW (EXISTING)
           ───────────────────────────────────────────────────────────── */
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpiCards.map((kpi, idx) => {
              const Icon = kpi.icon;
              return (
                <motion.div
                  key={kpi.title}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className="p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-4 hover:border-[#D1D5DB] transition-all group"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-semibold text-[#9CA3AF] tracking-wider uppercase">
                      {kpi.title}
                    </span>
                    <div className={`w-9 h-9 rounded-xl ${kpi.accentBg} flex items-center justify-center`}>
                      <Icon className="w-4 h-4 stroke-[1.75]" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-3xl font-black text-[#2B2B2B] tracking-tight">{kpi.value}</h3>
                    <p className="text-[11px] font-medium text-[#6B7280]">{kpi.subtitle}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Quick Analyzer Actions Bar */}
          <div className="p-4 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold text-[#2B2B2B] px-2">Launch Quick AI Analyzer:</span>
            <div className="flex flex-wrap gap-2 text-xs">
              <NavLink
                to="/dashboard/creator"
                className="px-3.5 py-2 rounded-xl bg-[#8E9A7D] text-white font-semibold transition-colors flex items-center space-x-2 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Creator Workspace</span>
              </NavLink>
              <NavLink
                to="/dashboard/post-verification"
                className="px-3.5 py-2 rounded-xl bg-[#F8F7F4] border border-[#E5E7EB] text-[#2B2B2B] hover:bg-[#8E9A7D] hover:text-white font-semibold transition-colors flex items-center space-x-2"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Post Verification</span>
              </NavLink>
              <NavLink
                to="/dashboard/document"
                className="px-3.5 py-2 rounded-xl bg-[#F8F7F4] border border-[#E5E7EB] text-[#2B2B2B] hover:bg-[#8E9A7D] hover:text-white font-semibold transition-colors flex items-center space-x-2"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Document PII</span>
              </NavLink>
              <NavLink
                to="/dashboard/image"
                className="px-3.5 py-2 rounded-xl bg-[#F8F7F4] border border-[#E5E7EB] text-[#2B2B2B] hover:bg-[#8E9A7D] hover:text-white font-semibold transition-colors flex items-center space-x-2"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Image Forensics</span>
              </NavLink>
              <NavLink
                to="/dashboard/website"
                className="px-3.5 py-2 rounded-xl bg-[#F8F7F4] border border-[#E5E7EB] text-[#2B2B2B] hover:bg-[#8E9A7D] hover:text-white font-semibold transition-colors flex items-center space-x-2"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Website Security</span>
              </NavLink>
              <NavLink
                to="/dashboard/text"
                className="px-3.5 py-2 rounded-xl bg-[#F8F7F4] border border-[#E5E7EB] text-[#2B2B2B] hover:bg-[#8E9A7D] hover:text-white font-semibold transition-colors flex items-center space-x-2"
              >
                <Type className="w-3.5 h-3.5" />
                <span>Text Authenticity</span>
              </NavLink>
            </div>
          </div>

          {/* Charts & Analytics Visualizers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Trust Score Trend Card */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-6">
              <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-4">
                <div>
                  <h3 className="text-base font-bold text-[#2B2B2B]">Trust Score Trajectory</h3>
                  <p className="text-xs text-[#6B7280]">7-Day rolling average trust score trend from database</p>
                </div>
                <span className="px-3 py-1 bg-[#F8F7F4] text-[#7F8F73] border border-[#E5E7EB] text-xs font-semibold rounded-full">
                  7-Day Window
                </span>
              </div>

              {/* SVG Trend Wave Graph */}
              <div className="h-56 w-full relative flex items-end">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150">
                  <defs>
                    <linearGradient id="chartSageGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8E9A7D" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#8E9A7D" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0 100 Q 80 40 160 80 T 320 30 T 500 60 L 500 150 L 0 150 Z"
                    fill="url(#chartSageGradient)"
                  />
                  <path
                    d="M 0 100 Q 80 40 160 80 T 320 30 T 500 60"
                    fill="none"
                    stroke="#8E9A7D"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex justify-between items-end px-2 text-[11px] font-mono text-[#9CA3AF] pb-1">
                  {summary.trustScoreTrend.map((t) => (
                    <span key={t.date}>
                      {t.day} ({t.avgScore !== null ? `${t.avgScore}%` : 'N/A'})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Risk & Modality Distribution */}
            <div className="p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-6">
              <h3 className="text-base font-bold text-[#2B2B2B] border-b border-[#E5E7EB] pb-4">
                Risk Level Breakdown
              </h3>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-[#2B2B2B]">Low Risk</span>
                    <span className="text-[#5B8C5A] font-bold">{summary.riskDistribution.low} Records</span>
                  </div>
                  <div className="h-2 w-full bg-[#F3F2EF] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#5B8C5A]"
                      style={{
                        width: summary.totalAnalyses ? `${(summary.riskDistribution.low / summary.totalAnalyses) * 100}%` : '0%',
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-[#2B2B2B]">Medium Risk</span>
                    <span className="text-[#D9A441] font-bold">{summary.riskDistribution.medium} Records</span>
                  </div>
                  <div className="h-2 w-full bg-[#F3F2EF] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#D9A441]"
                      style={{
                        width: summary.totalAnalyses ? `${(summary.riskDistribution.medium / summary.totalAnalyses) * 100}%` : '0%',
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-[#2B2B2B]">High Risk</span>
                    <span className="text-[#D96C6C] font-bold">{summary.riskDistribution.high} Records</span>
                  </div>
                  <div className="h-2 w-full bg-[#F3F2EF] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#D96C6C]"
                      style={{
                        width: summary.totalAnalyses ? `${(summary.riskDistribution.high / summary.totalAnalyses) * 100}%` : '0%',
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-[#2B2B2B]">Critical Risk</span>
                    <span className="text-[#D96C6C] font-black">{summary.riskDistribution.critical} Records</span>
                  </div>
                  <div className="h-2 w-full bg-[#F3F2EF] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#D96C6C]"
                      style={{
                        width: summary.totalAnalyses ? `${(summary.riskDistribution.critical / summary.totalAnalyses) * 100}%` : '0%',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Incident Feed Table */}
          <div className="p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#2B2B2B]">Recent Security Threat & Audit Log</h3>
                <p className="text-xs text-[#6B7280]">Live database records of your recent evaluations</p>
              </div>
              <NavLink to="/dashboard/history" className="text-xs text-[#7F8F73] font-semibold hover:underline flex items-center space-x-1">
                <span>View Full Audit History</span>
                <ExternalLink className="w-3 h-3" />
              </NavLink>
            </div>

            {summary.recentAnalyses.length === 0 ? (
              <div className="p-12 text-center text-[#9CA3AF] text-xs space-y-2">
                <p>No analysis records found in MongoDB database.</p>
                <p className="text-[11px] text-[#6B7280]">Run your first document, image, website, or text analysis to populate this timeline!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F7F4] text-[#6B7280] font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5 rounded-l-xl">Target Entity</th>
                      <th className="p-3.5">Type</th>
                      <th className="p-3.5">Risk Level</th>
                      <th className="p-3.5">Trust Score</th>
                      <th className="p-3.5">Insights Summary</th>
                      <th className="p-3.5 rounded-r-xl">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] font-mono">
                    {summary.recentAnalyses.map((item) => (
                      <tr key={item._id} className="hover:bg-[#F8F7F4] transition-colors">
                        <td className="p-3.5 text-[#2B2B2B] font-medium truncate max-w-xs">{item.targetEntity}</td>
                        <td className="p-3.5 text-[#6B7280] font-sans capitalize">{item.entityType}</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              item.riskCategory === 'critical' || item.riskCategory === 'high'
                                ? 'bg-[#D96C6C]/15 text-[#D96C6C] border border-[#D96C6C]/20'
                                : item.riskCategory === 'medium'
                                ? 'bg-[#D9A441]/15 text-[#D9A441] border border-[#D9A441]/20'
                                : 'bg-[#5B8C5A]/15 text-[#5B8C5A] border border-[#5B8C5A]/20'
                            }`}
                          >
                            {item.riskCategory}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-[#2B2B2B]">{item.trustScore}%</td>
                        <td className="p-3.5 text-[#6B7280] font-sans truncate max-w-sm">
                          {item.insights?.[0] || 'Analysis completed.'}
                        </td>
                        <td className="p-3.5 text-[#9CA3AF]">
                          {new Date(item.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
