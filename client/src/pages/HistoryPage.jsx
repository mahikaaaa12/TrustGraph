import React, { useState } from 'react';
import { Search } from 'lucide-react';

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
        <h1 className="text-2xl font-bold text-[#2B2B2B] tracking-tight">Audit Trail & Analysis History</h1>
        <p className="text-xs text-[#6B7280] mt-1">
          Historical log of all digital trust evaluations, file forensics, domain security scans, and NLP assessments.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] w-4 h-4 stroke-[1.5]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search history records..."
            className="w-full pl-10 pr-4 py-2 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl text-xs text-[#2B2B2B] placeholder-[#9CA3AF] focus:outline-none focus:border-[#8E9A7D] font-mono"
          />
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {['ALL', 'DOCUMENT', 'IMAGE', 'WEBSITE', 'TEXT'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3.5 py-2 rounded-xl font-semibold transition-colors ${
                filterType === type
                  ? 'bg-[#8E9A7D] text-white shadow-xs'
                  : 'bg-[#F8F7F4] text-[#6B7280] hover:text-[#2B2B2B] border border-[#E5E7EB]'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F7F4] text-[#6B7280] font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3.5 rounded-l-xl">Analysis ID</th>
                <th className="p-3.5">Target Entity</th>
                <th className="p-3.5">Modality</th>
                <th className="p-3.5">Trust Score</th>
                <th className="p-3.5">Risk Level</th>
                <th className="p-3.5 rounded-r-xl">Execution Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] font-mono">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-[#F8F7F4] transition-colors">
                  <td className="p-3.5 text-[#7F8F73] font-bold">#TR-{item.id}0492</td>
                  <td className="p-3.5 text-[#2B2B2B] font-medium truncate max-w-xs">{item.entity}</td>
                  <td className="p-3.5 text-[#6B7280] capitalize font-sans">{item.type}</td>
                  <td className="p-3.5 font-bold text-[#2B2B2B]">{item.trustScore}%</td>
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        item.risk === 'critical'
                          ? 'bg-[#D96C6C]/15 text-[#D96C6C] border border-[#D96C6C]/20'
                          : item.risk === 'medium'
                          ? 'bg-[#D9A441]/15 text-[#D9A441] border border-[#D9A441]/20'
                          : 'bg-[#5B8C5A]/15 text-[#5B8C5A] border border-[#5B8C5A]/20'
                      }`}
                    >
                      {item.risk}
                    </span>
                  </td>
                  <td className="p-3.5 text-[#9CA3AF]">{item.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
