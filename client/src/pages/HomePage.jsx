import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

export default function HomePage() {
  const [telemetry, setTelemetry] = useState({
    totalAnalyses: 1428,
    avgTrustScore: 87.4,
    threatsDetected: 42,
    filesProcessed: 892,
    todayScans: 156,
    serverStatus: 'running',
    dbStatus: 'connected',
    uptime: 3600,
  });

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await api.get('/health');
        if (res.data) {
          setTelemetry((prev) => ({
            ...prev,
            serverStatus: res.data.server || 'running',
            dbStatus: res.data.database || 'connected',
            uptime: res.data.uptime || 3600,
          }));
        }
      } catch (err) {
        setTelemetry((prev) => ({ ...prev, dbStatus: 'disconnected' }));
      }
    };
    fetchHealth();
  }, []);

  const kpiCards = [
    {
      title: 'TOTAL ANALYSES RUN',
      value: telemetry.totalAnalyses.toLocaleString(),
      change: '+14.2% this week',
      isUp: true,
      icon: TrendingUp,
      accentBg: 'bg-[#8E9A7D]/10 text-[#7F8F73]',
    },
    {
      title: 'AVERAGE TRUST SCORE',
      value: `${telemetry.avgTrustScore}%`,
      change: '+2.1% score gain',
      isUp: true,
      icon: Shield,
      accentBg: 'bg-[#5B8C5A]/10 text-[#5B8C5A]',
    },
    {
      title: 'THREATS FLAGGED',
      value: telemetry.threatsDetected,
      change: '-5 critical alerts',
      isUp: false,
      icon: AlertTriangle,
      accentBg: 'bg-[#D96C6C]/10 text-[#D96C6C]',
    },
    {
      title: 'FILES PROCESSED',
      value: telemetry.filesProcessed,
      change: '+89 PDF & Images',
      isUp: true,
      icon: FileText,
      accentBg: 'bg-[#D9A441]/10 text-[#D9A441]',
    },
  ];

  const recentIncidents = [
    { id: 1, entity: 'contract_v2_confidential.pdf', type: 'Document', risk: 'Critical', score: 32.5, time: '12 mins ago', detail: 'Detected 4 leaked API Keys & SSN pattern' },
    { id: 2, entity: 'https://verify-account-update.xyz', type: 'Website', risk: 'High', score: 48.0, time: '28 mins ago', detail: 'Suspicious WHOIS age (3 days old) & phishing trigger' },
    { id: 3, entity: 'executive_headshot_tampered.jpg', type: 'Image', risk: 'High', score: 55.2, time: '45 mins ago', detail: 'ELA error rate 34% (Photoshop modification traces)' },
    { id: 4, entity: 'statement_ai_generated.txt', type: 'Text', risk: 'Medium', score: 68.0, time: '1 hour ago', detail: 'Low burstiness sentence rhythm (AI probability 88%)' },
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
          <span className="w-2 h-2 rounded-full bg-[#5B8C5A] animate-pulse" />
          <div className="text-xs font-mono text-[#6B7280]">
            Cluster Mode: <strong className="text-[#2B2B2B]">DEVELOPMENT</strong>
          </div>
        </div>
      </div>

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
                <div className="flex items-center space-x-1 pt-1">
                  <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-[#6B7280]">
                    {kpi.isUp ? <ArrowUpRight className="w-3 h-3 text-[#5B8C5A]" /> : <ArrowDownRight className="w-3 h-3 text-[#D96C6C]" />}
                    <span>{kpi.change}</span>
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts & Analytics Visualizers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trust Score Trend Card */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-6">
          <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-4">
            <div>
              <h3 className="text-base font-bold text-[#2B2B2B]">Trust Score Stability Trend</h3>
              <p className="text-xs text-[#6B7280]">7-Day composite score trajectory</p>
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
              <span>Mon (82%)</span>
              <span>Tue (85%)</span>
              <span>Wed (79%)</span>
              <span>Thu (91%)</span>
              <span>Fri (88%)</span>
              <span>Sat (94%)</span>
              <span>Sun (87.4%)</span>
            </div>
          </div>
        </div>

        {/* Modality Breakdown Bar */}
        <div className="p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-6">
          <h3 className="text-base font-bold text-[#2B2B2B] border-b border-[#E5E7EB] pb-4">
            Analysis Modality Breakdown
          </h3>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-[#2B2B2B] flex items-center space-x-2">
                  <FileText className="w-3.5 h-3.5 text-[#8E9A7D]" />
                  <span>Document Scans</span>
                </span>
                <span className="text-[#2B2B2B] font-bold">42% (600)</span>
              </div>
              <div className="h-2 w-full bg-[#F3F2EF] rounded-full overflow-hidden">
                <div className="h-full bg-[#8E9A7D] w-[42%]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-[#2B2B2B] flex items-center space-x-2">
                  <ImageIcon className="w-3.5 h-3.5 text-[#5B8C5A]" />
                  <span>Image Forensics</span>
                </span>
                <span className="text-[#2B2B2B] font-bold">28% (400)</span>
              </div>
              <div className="h-2 w-full bg-[#F3F2EF] rounded-full overflow-hidden">
                <div className="h-full bg-[#5B8C5A] w-[28%]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-[#2B2B2B] flex items-center space-x-2">
                  <Globe className="w-3.5 h-3.5 text-[#D9A441]" />
                  <span>Website URL Scans</span>
                </span>
                <span className="text-[#2B2B2B] font-bold">18% (256)</span>
              </div>
              <div className="h-2 w-full bg-[#F3F2EF] rounded-full overflow-hidden">
                <div className="h-full bg-[#D9A441] w-[18%]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-[#2B2B2B] flex items-center space-x-2">
                  <Type className="w-3.5 h-3.5 text-[#D96C6C]" />
                  <span>Text Authenticity</span>
                </span>
                <span className="text-[#2B2B2B] font-bold">12% (172)</span>
              </div>
              <div className="h-2 w-full bg-[#F3F2EF] rounded-full overflow-hidden">
                <div className="h-full bg-[#D96C6C] w-[12%]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Incident Feed Table */}
      <div className="p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-4">
        <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-3">
          <div>
            <h3 className="text-base font-bold text-[#2B2B2B]">Recent Security Threat Incidents</h3>
            <p className="text-xs text-[#6B7280]">Live operational alerts flagged by AI evaluation engines</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F7F4] text-[#6B7280] font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3.5 rounded-l-xl">Target Entity</th>
                <th className="p-3.5">Type</th>
                <th className="p-3.5">Risk Level</th>
                <th className="p-3.5">Trust Score</th>
                <th className="p-3.5">Threat Description</th>
                <th className="p-3.5 rounded-r-xl">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] font-mono">
              {recentIncidents.map((item) => (
                <tr key={item.id} className="hover:bg-[#F8F7F4] transition-colors">
                  <td className="p-3.5 text-[#2B2B2B] font-medium truncate max-w-xs">{item.entity}</td>
                  <td className="p-3.5 text-[#6B7280] font-sans">{item.type}</td>
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        item.risk === 'Critical'
                          ? 'bg-[#D96C6C]/15 text-[#D96C6C] border border-[#D96C6C]/20'
                          : item.risk === 'High'
                          ? 'bg-[#D9A441]/15 text-[#D9A441] border border-[#D9A441]/20'
                          : 'bg-[#5B8C5A]/15 text-[#5B8C5A] border border-[#5B8C5A]/20'
                      }`}
                    >
                      {item.risk}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-[#2B2B2B]">{item.score}%</td>
                  <td className="p-3.5 text-[#6B7280] font-sans">{item.detail}</td>
                  <td className="p-3.5 text-[#9CA3AF]">{item.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
