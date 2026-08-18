import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Search, Loader2, ChevronLeft, ChevronRight, Filter, ExternalLink } from 'lucide-react';

export default function HistoryPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 15,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterRisk, setFilterRisk] = useState('ALL');

  const fetchHistory = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: pagination.limit,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (filterType !== 'ALL') params.type = filterType;
      if (filterRisk !== 'ALL') params.risk = filterRisk;

      const res = await api.get('/history', { params });
      if (res.data?.success) {
        setItems(res.data.data.items || []);
        setPagination(res.data.data.pagination);
      }
    } catch (err) {
      setError(err.message || 'Failed to load audit history records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHistory(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, filterType, filterRisk]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchHistory(newPage);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#2B2B2B] tracking-tight">Audit Trail & Analysis History</h1>
        <p className="text-xs text-[#6B7280] mt-1">
          Historical log of all digital trust evaluations, file forensics, domain security scans, and NLP assessments.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] w-4 h-4 stroke-[1.5]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search target entity, insights..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl text-xs text-[#2B2B2B] placeholder-[#9CA3AF] focus:outline-none focus:border-[#8E9A7D] font-mono"
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

        <div className="flex items-center space-x-2 pt-2 border-t border-[#E5E7EB] text-xs">
          <Filter className="w-3.5 h-3.5 text-[#9CA3AF]" />
          <span className="text-[#6B7280]">Risk Filter:</span>
          {['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((r) => (
            <button
              key={r}
              onClick={() => setFilterRisk(r)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                filterRisk === r
                  ? 'bg-[#2B2B2B] text-white'
                  : 'text-[#6B7280] hover:text-[#2B2B2B]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* History Table Card */}
      <div className="p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-4">
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#8E9A7D] animate-spin mx-auto" />
            <p className="text-xs font-mono text-[#6B7280]">Querying MongoDB history index...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-[#D96C6C]/10 border border-[#D96C6C]/30 rounded-xl text-xs text-[#D96C6C]">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center text-[#9CA3AF] text-xs space-y-2">
            <p className="font-semibold text-[#2B2B2B]">No audit history records found.</p>
            <p className="text-[#6B7280]">Try clearing your search query or modality filters.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F7F4] text-[#6B7280] font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5 rounded-l-xl">Analysis ID</th>
                    <th className="p-3.5">Target Entity</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Trust Score</th>
                    <th className="p-3.5">Risk Level</th>
                    <th className="p-3.5 rounded-r-xl">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] font-mono">
                  {items.map((item) => (
                    <tr
                      key={item._id}
                      onClick={() => navigate(`/dashboard/analysis/${item._id}`)}
                      className="hover:bg-[#F8F7F4] transition-colors cursor-pointer group"
                    >
                      <td className="p-3.5 text-[#7F8F73] font-bold group-hover:underline flex items-center space-x-1">
                        <span>#...{item._id.substring(item._id.length - 6)}</span>
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </td>
                      <td className="p-3.5 text-[#2B2B2B] font-medium truncate max-w-xs">{item.targetEntity}</td>
                      <td className="p-3.5 text-[#6B7280] capitalize font-sans">{item.entityType}</td>
                      <td className="p-3.5 font-bold text-[#2B2B2B]">{item.trustScore}%</td>
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
                      <td className="p-3.5 text-[#9CA3AF]">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-[#E5E7EB] text-xs">
              <span className="text-[#6B7280]">
                Showing page <strong className="text-[#2B2B2B]">{pagination.currentPage}</strong> of{' '}
                <strong className="text-[#2B2B2B]">{pagination.totalPages}</strong> ({pagination.totalItems} total records)
              </span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="p-2 rounded-xl bg-[#F8F7F4] border border-[#E5E7EB] text-[#2B2B2B] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F3F2EF]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="p-2 rounded-xl bg-[#F8F7F4] border border-[#E5E7EB] text-[#2B2B2B] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F3F2EF]"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
