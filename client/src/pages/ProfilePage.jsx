import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Key } from 'lucide-react';

export default function ProfilePage() {
  const { user, token } = useAuth();

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#2B2B2B] tracking-tight">Security Analyst Profile</h1>
        <p className="text-xs text-[#6B7280] mt-1">
          Inspect security credentials, active JWT session token properties, and user account metadata.
        </p>
      </div>

      <div className="p-8 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-[#E5E7EB] pb-6">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-full bg-[#8E9A7D]/20 text-[#7F8F73] border border-[#8E9A7D]/30 flex items-center justify-center font-extrabold text-xl">
              {user?.name?.[0] || 'A'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#2B2B2B]">{user?.name || 'Sarah Connor'}</h2>
              <p className="text-xs text-[#6B7280] font-mono">{user?.email || 'sarah@cyberdyne.org'}</p>
            </div>
          </div>

          <span className="px-3.5 py-1.5 rounded-full bg-[#F8F7F4] text-[#7F8F73] border border-[#E5E7EB] text-xs font-semibold capitalize self-start sm:self-auto">
            {user?.role || 'Analyst'} Role
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1">
            <span className="text-[#9CA3AF]">Account ID</span>
            <p className="text-[#2B2B2B] truncate">{user?._id || '66b0e81ac8e2a149f8a31d99'}</p>
          </div>
          <div className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1">
            <span className="text-[#9CA3AF]">Analyst Trust Level Score</span>
            <p className="text-[#5B8C5A] font-bold">{user?.trustLevelScore || 50}.0 / 100</p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider flex items-center space-x-2">
            <Key className="w-4 h-4 text-[#D9A441]" />
            <span>Active Session Token (JWT)</span>
          </h3>
          <div className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] break-all text-xs font-mono text-[#D9A441]">
            {token || 'No active JWT session.'}
          </div>
        </div>
      </div>
    </div>
  );
}
