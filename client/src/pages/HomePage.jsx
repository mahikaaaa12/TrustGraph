import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../services/api';
import { motion } from 'framer-motion';
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
} from 'lucide-react';

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  const [healthStatus, setHealthStatus] = useState('connected');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [summaryRes, healthRes] = await Promise.allSettled([
          api.get('/dashboard/summary'),
          api.get('/health'),
        ]);

        if (summaryRes.status === 'fulfilled' && summaryRes.value.data?.data) {
          setSummary(summaryRes.value.data.data);
        }

        if (healthRes.status === 'fulfilled' && healthRes.value.data) {
          setHealthStatus(healthRes.value.data.database || 'connected');
        }
      } catch (err) {
        setError(err.message || 'Failed to load dashboard metrics.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const totalThreats = summary.riskDistribution.critical + summary.riskDistribution.high;

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

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Summary */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#2B2B2B] tracking-tight">
            Enterprise Security Dashboard
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Real-time digital trust telemetry, multi-modal threat analysis, and AI risk monitoring.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 bg-white border border-[#E5E7EB] px-3.5 py-2 rounded-xl shadow-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              healthStatus === 'connected' ? 'bg-[#5B8C5A] animate-pulse' : 'bg-[#D96C6C]'
            }`}
          />
          <div className="text-xs font-mono text-[#6B7280]">
            Database Cluster: <strong className="text-[#2B2B2B] capitalize">{healthStatus}</strong>
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
      ) : (
        <>
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
              <NavLink
                to="/dashboard/trust-score"
                className="px-3.5 py-2 rounded-xl bg-[#8E9A7D] text-white font-semibold transition-colors flex items-center space-x-2 shadow-xs"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Trust Score Engine</span>
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
        </>
      )}
    </div>
  );
}
