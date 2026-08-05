import React from 'react';
import { useAuth } from '../context/AuthContext';
import { FaUserCircle, FaShieldAlt, FaKey, FaHistory, FaCheckCircle } from 'react-icons/fa';

export default function ProfilePage() {
  const { user, token } = useAuth();

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Security Analyst Profile</h1>
        <p className="text-sm text-slate-400 mt-1">
          Inspect security credentials, active JWT session token properties, and user account metadata.
        </p>
      </div>

      {/* User Info Card */}
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-slate-800 pb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-extrabold text-2xl">
              {user?.name?.[0] || 'A'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{user?.name || 'Sarah Connor'}</h2>
              <p className="text-xs text-slate-400 font-mono">{user?.email || 'sarah@cyberdyne.org'}</p>
            </div>
          </div>

          <span className="px-3.5 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold capitalize self-start sm:self-auto">
            {user?.role || 'Analyst'} Role
          </span>
        </div>

        {/* Account Telemetry */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-500">Account ID</span>
            <p className="text-slate-200 truncate">{user?._id || '66b0e81ac8e2a149f8a31d99'}</p>
          </div>
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-500">Analyst Trust Level Score</span>
            <p className="text-emerald-400 font-bold">{user?.trustLevelScore || 50}.0 / 100</p>
          </div>
        </div>

        {/* Token Details */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-2">
            <FaKey className="text-amber-400" />
            <span>Active Session Token (JWT)</span>
          </h3>
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 break-all text-xs font-mono text-amber-300">
            {token || 'No active JWT session.'}
          </div>
        </div>
      </div>
    </div>
  );
}
