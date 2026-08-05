import React, { useState } from 'react';
import { useErrorLogs } from '../context/ErrorLogContext';
import { FaBug, FaTrashAlt, FaExclamationTriangle, FaNetworkWired } from 'react-icons/fa';

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
          <h1 className="text-2xl font-bold text-white tracking-tight">Error Telemetry & Log Console</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time interceptor capture for Network Errors, 4xx Validation Failures, and 5xx API Exceptions.
          </p>
        </div>

        {errorLogs.length > 0 && (
          <button
            onClick={clearErrorLogs}
            className="px-4 py-2 bg-rose-600/20 text-rose-400 border border-rose-500/30 hover:bg-rose-600/30 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-2"
          >
            <FaTrashAlt />
            <span>Clear Log Console</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 w-fit text-xs font-semibold">
        {['ALL', 'NETWORK', 'API', 'VALIDATION'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-4 py-2 rounded-xl transition-all ${
              filterType === type
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
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
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-3">
                  <span className="px-2.5 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-xs font-mono font-bold">
                    {log.status}
                  </span>
                  <span className="font-mono text-xs text-white font-bold">{log.method}</span>
                  <code className="text-xs text-slate-300 font-mono">{log.url}</code>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">{log.timestamp}</span>
              </div>

              <p className="text-xs text-rose-300 font-medium">{log.message}</p>

              {log.data && (
                <pre className="p-3 bg-slate-950 rounded-xl text-[11px] font-mono text-slate-400 border border-slate-800 overflow-x-auto max-h-40">
                  {JSON.stringify(log.data, null, 2)}
                </pre>
              )}
            </div>
          ))
        ) : (
          <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-500 text-xs italic">
            No error logs recorded matching current filter criteria.
          </div>
        )}
      </div>
    </div>
  );
}
