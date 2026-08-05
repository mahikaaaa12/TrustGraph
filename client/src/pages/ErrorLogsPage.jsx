import React, { useState } from 'react';
import { useErrorLogs } from '../context/ErrorLogContext';
import { Trash2, AlertTriangle, Bug } from 'lucide-react';

export default function ErrorLogsPage() {
  const { errorLogs, clearErrorLogs } = useErrorLogs();
  const [filterType, setFilterType] = useState('ALL');

  const filteredLogs = errorLogs.filter((log) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'NETWORK') return log.status === 'NETWORK_ERROR';
    if (filterType === 'API') return typeof log.status === 'number' && log.status >= 500;
    if (filterType === 'VALIDATION') return log.status === 400 || log.status === 422;
    return true;
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2B2B2B] tracking-tight">Error Telemetry & Log Console</h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Real-time interceptor capture for Network Errors, 4xx Validation Failures, and 5xx API Exceptions.
          </p>
        </div>

        {errorLogs.length > 0 && (
          <button
            onClick={clearErrorLogs}
            className="px-4 py-2.5 bg-[#D96C6C]/10 text-[#D96C6C] border border-[#D96C6C]/20 hover:bg-[#D96C6C]/20 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-2"
          >
            <Trash2 className="w-4 h-4 stroke-[1.75]" />
            <span>Clear Log Console</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 text-xs font-semibold">
        {['ALL', 'NETWORK', 'API', 'VALIDATION'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-4 py-2.5 rounded-xl border transition-colors ${
              filterType === type
                ? 'bg-[#8E9A7D] text-white border-[#8E9A7D] shadow-xs'
                : 'bg-white text-[#6B7280] hover:text-[#2B2B2B] border-[#E5E7EB]'
            }`}
          >
            {type} ERRORS
          </button>
        ))}
      </div>

      {/* Logs List */}
      <div className="space-y-4">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-6 rounded-2xl bg-white border border-[#E5E7EB] space-y-3 shadow-xs"
            >
              <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <div className="flex items-center space-x-3">
                  <span className="px-2.5 py-1 bg-[#D96C6C]/15 text-[#D96C6C] border border-[#D96C6C]/20 rounded text-xs font-mono font-bold">
                    {log.status}
                  </span>
                  <span className="font-mono text-xs text-[#2B2B2B] font-bold">{log.method}</span>
                  <code className="text-xs text-[#6B7280] font-mono">{log.url}</code>
                </div>
                <span className="text-[11px] text-[#9CA3AF] font-mono">{log.timestamp}</span>
              </div>

              <p className="text-xs text-[#D96C6C] font-semibold">{log.message}</p>

              {log.data && (
                <pre className="p-3 bg-[#F8F7F4] rounded-xl text-[11px] font-mono text-[#7F8F73] border border-[#E5E7EB] overflow-x-auto max-h-40">
                  {JSON.stringify(log.data, null, 2)}
                </pre>
              )}
            </div>
          ))
        ) : (
          <div className="p-12 bg-white border border-[#E5E7EB] rounded-2xl text-center text-[#9CA3AF] text-xs italic shadow-xs">
            No error logs recorded matching current filter criteria.
          </div>
        )}
      </div>
    </div>
  );
}
