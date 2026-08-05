import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useErrorLogs } from '../context/ErrorLogContext';
import { FaCog, FaServer, FaTrashAlt, FaSave } from 'react-icons/fa';

export default function SettingsPage() {
  const { logout } = useAuth();
  const { clearErrorLogs, showToast } = useErrorLogs();

  const [apiUrl, setApiUrl] = useState(
    import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
  );

  const handleSaveSettings = (e) => {
    e.preventDefault();
    showToast('Developer settings updated successfully.', 'success');
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Developer Dashboard Settings</h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure local environment proxies, token storage policies, and developer state caches.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400">Target Backend API Base URL</label>
            <div className="mt-1 flex gap-3">
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-xs transition-colors flex items-center space-x-2 shadow-lg shadow-blue-600/20"
              >
                <FaSave />
                <span>Save Base URL</span>
              </button>
            </div>
          </div>
        </form>

        <div className="border-t border-slate-800 pt-6 space-y-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Developer Cache Control
          </h2>
          <div className="flex gap-4">
            <button
              onClick={() => {
                logout();
                showToast('Authentication session token cleared.', 'info');
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition-colors flex items-center space-x-2"
            >
              <FaTrashAlt />
              <span>Reset JWT Token Storage</span>
            </button>
            <button
              onClick={() => {
                clearErrorLogs();
                showToast('In-memory error logs cleared.', 'info');
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition-colors flex items-center space-x-2"
            >
              <FaTrashAlt />
              <span>Clear Error Logs Console</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
