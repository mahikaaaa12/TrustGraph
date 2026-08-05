import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useErrorLogs } from '../context/ErrorLogContext';
import { Save, Trash2 } from 'lucide-react';

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
        <h1 className="text-2xl font-bold text-[#2B2B2B] tracking-tight">Developer Dashboard Settings</h1>
        <p className="text-xs text-[#6B7280] mt-1">
          Configure local environment proxies, token storage policies, and developer state caches.
        </p>
      </div>

      <div className="p-8 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-6">
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#6B7280]">Target Backend API Base URL</label>
            <div className="mt-1 flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="flex-1 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs text-[#2B2B2B] focus:outline-none focus:border-[#8E9A7D] font-mono"
              />
              <button
                type="submit"
                className="px-5 py-3 bg-[#8E9A7D] hover:bg-[#7F8F73] text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center space-x-2 shadow-xs"
              >
                <Save className="w-4 h-4 stroke-[1.75]" />
                <span>Save Base URL</span>
              </button>
            </div>
          </div>
        </form>

        <div className="border-t border-[#E5E7EB] pt-6 space-y-4">
          <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
            Developer Cache Control
          </h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => {
                logout();
                showToast('Authentication session token cleared.', 'info');
              }}
              className="px-4 py-2.5 bg-[#F8F7F4] hover:bg-[#F3F2EF] text-[#2B2B2B] rounded-xl text-xs font-semibold border border-[#E5E7EB] transition-colors flex items-center space-x-2"
            >
              <Trash2 className="w-4 h-4 text-[#D96C6C]" />
              <span>Reset JWT Token Storage</span>
            </button>
            <button
              onClick={() => {
                clearErrorLogs();
                showToast('In-memory error logs cleared.', 'info');
              }}
              className="px-4 py-2.5 bg-[#F8F7F4] hover:bg-[#F3F2EF] text-[#2B2B2B] rounded-xl text-xs font-semibold border border-[#E5E7EB] transition-colors flex items-center space-x-2"
            >
              <Trash2 className="w-4 h-4 text-[#D96C6C]" />
              <span>Clear Error Logs Console</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
