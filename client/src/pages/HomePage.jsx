import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { motion } from 'framer-motion';
import {
  FaShieldAlt,
  FaFileAlt,
  FaExclamationTriangle,
  FaChartLine,
  FaCheckCircle,
  FaGlobe,
  FaImage,
  FaFont,
  FaArrowUp,
  FaArrowDown,
} from 'react-icons/fa';

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
      icon: FaChartLine,
      color: 'from-blue-600 to-indigo-600',
      badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    },
    {
      title: 'AVERAGE TRUST SCORE',
      value: `${telemetry.avgTrustScore}%`,
      change: '+2.1% score gain',
      isUp: true,
      icon: FaShieldAlt,
      color: 'from-emerald-600 to-teal-600',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'THREATS FLAGGED',
      value: telemetry.threatsDetected,
      change: '-5 critical alerts',
      isUp: false,
      icon: FaExclamationTriangle,
      color: 'from-rose-600 to-red-600',
      badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    },
    {
      title: 'FILES PROCESSED',
      value: telemetry.filesProcessed,
      change: '+89 PDF & Images',
      isUp: true,
      icon: FaFileAlt,
      color: 'from-amber-600 to-orange-600',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
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
      {/* Page Title & Cluster Health Summary */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-3">
            <span>Enterprise Security Dashboard</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time digital trust telemetry, multi-modal threat analysis, and AI risk monitoring.
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 p-2.5 px-4 rounded-2xl shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <div className="text-xs">
            <span className="text-slate-400 block">System Cluster:</span>
            <span className="text-white font-bold font-mono">NODE_ENV: DEVELOPMENT</span>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.08 }}
              className="p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/50 border border-slate-800/80 shadow-xl space-y-4 hover:border-slate-700 transition-all group"
            >
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-slate-400 tracking-wider">
                  {kpi.title}
                </span>
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center text-white shadow-lg`}
                >
                  <Icon className="text-lg" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-3xl font-black text-white tracking-tight">{kpi.value}</h3>
                <div className="flex items-center space-x-1.5 pt-1">
                  <span
                    className={`inline-flex items-center space-x-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${kpi.badgeColor}`}
                  >
                    {kpi.isUp ? <FaArrowUp size={10} /> : <FaArrowDown size={10} />}
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
        {/* Trust Score Trend Area Visualizer */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-xl space-y-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white">Trust Score Stability Trend</h3>
              <p className="text-xs text-slate-400">7-Day system-wide composite score trajectory</p>
            </div>
            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold rounded-full">
              7-Day Window
            </span>
          </div>

          {/* Custom SVG Trend Wave Graph */}
          <div className="h-56 w-full relative flex items-end">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 100 Q 80 40 160 80 T 320 30 T 500 60 L 500 150 L 0 150 Z"
                fill="url(#chartGradient)"
              />
              <path
                d="M 0 100 Q 80 40 160 80 T 320 30 T 500 60"
                fill="none"
                stroke="#2563EB"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex justify-between items-end px-2 text-[11px] font-mono text-slate-500 pb-1">
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
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-xl space-y-6">
          <h3 className="text-base font-bold text-white border-b border-slate-800 pb-4">
            Analysis Modality Breakdown
          </h3>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-300 flex items-center space-x-2">
                  <FaFileAlt className="text-blue-400" />
                  <span>Document Scans</span>
                </span>
                <span className="text-white font-bold">42% (600 files)</span>
              </div>
              <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-[42%]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-300 flex items-center space-x-2">
                  <FaImage className="text-indigo-400" />
                  <span>Image Forensics</span>
                </span>
                <span className="text-white font-bold">28% (400 files)</span>
              </div>
              <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 w-[28%]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-300 flex items-center space-x-2">
                  <FaGlobe className="text-emerald-400" />
                  <span>Website URL Scans</span>
                </span>
                <span className="text-white font-bold">18% (256 URLs)</span>
              </div>
              <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[18%]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-300 flex items-center space-x-2">
                  <FaFont className="text-amber-400" />
                  <span>Text Authenticity</span>
                </span>
                <span className="text-white font-bold">12% (172 texts)</span>
              </div>
              <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 w-[12%]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Threat Incident Feed Table */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-xl space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white">Recent Security Threat Incidents</h3>
            <p className="text-xs text-slate-400">Live operational alerts flagged by AI evaluation engines</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3 rounded-l-xl">Target Entity</th>
                <th className="p-3">Type</th>
                <th className="p-3">Risk Level</th>
                <th className="p-3">Trust Score</th>
                <th className="p-3">Threat Description</th>
                <th className="p-3 rounded-r-xl">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {recentIncidents.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3 text-white font-medium truncate max-w-xs">{item.entity}</td>
                  <td className="p-3 text-slate-400">{item.type}</td>
                  <td className="p-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        item.risk === 'Critical'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : item.risk === 'High'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {item.risk}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-white">{item.score}%</td>
                  <td className="p-3 text-slate-300 font-sans">{item.detail}</td>
                  <td className="p-3 text-slate-500">{item.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
