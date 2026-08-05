import React, { useState } from 'react';
import { FaHistory, FaSearch, FaFilter, FaFileAlt, FaImage, FaGlobe, FaFont, FaShieldAlt } from 'react-icons/fa';

export default function HistoryPage() {
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const dummyHistory = [
    { id: '1', entity: 'financial_report_2026.pdf', type: 'document', trustScore: 88.5, risk: 'low', date: '2026-08-05 08:30:12' },
    { id: '2', entity: 'passport_scan_forged.jpg', type: 'image', trustScore: 42.0, risk: 'critical', date: '2026-08-05 07:15:44' },
    { id: '3', entity: 'https://login-secure-banking.net', type: 'website', trustScore: 35.0, risk: 'critical', date: '2026-08-04 22:11:00' },
    { id: '4', entity: 'press_release_ai_generated.txt', type: 'text', trustScore: 71.0, risk: 'medium', date: '2026-08-04 19:04:22' },
    { id: '5', entity: 'https://google.com', type: 'website', trustScore: 98.0, risk: 'low', date: '2026-08-04 15:40:10' },
  ];

  const filteredItems = dummyHistory.filter((item) => {
    const matchesType = filterType === 'ALL' || item.type.toUpperCase() === filterType;
    const matchesSearch = item.entity.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Audit Trail & Analysis History</h1>
        <p className="text-sm text-slate-400 mt-1">
          Historical log of all digital trust evaluations, file forensics, domain security scans, and NLP assessments.
        </p>
      </div>

      {/* Filter & Controls Bar */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search history records..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2 text-xs">
          {['ALL', 'DOCUMENT', 'IMAGE', 'WEBSITE', 'TEXT'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3.5 py-2 rounded-xl font-semibold transition-colors ${
                filterType === type
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* History Table */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3.5 rounded-l-xl">Analysis ID</th>
                <th className="p-3.5">Target Entity</th>
                <th className="p-3.5">Modality</th>
                <th className="p-3.5">Trust Score</th>
                <th className="p-3.5">Risk Level</th>
                <th className="p-3.5 rounded-r-xl">Execution Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 text-blue-400 font-bold">#TR-{item.id}0492</td>
                  <td className="p-3.5 text-white font-medium truncate max-w-xs">{item.entity}</td>
                  <td className="p-3.5 text-slate-400 capitalize">{item.type}</td>
                  <td className="p-3.5 font-bold text-white">{item.trustScore}%</td>
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        item.risk === 'critical'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : item.risk === 'medium'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {item.risk}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-500">{item.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
