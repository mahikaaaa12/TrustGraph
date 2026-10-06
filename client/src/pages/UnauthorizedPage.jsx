import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Lock, ShieldAlert, ArrowLeft, User } from 'lucide-react';

export default function UnauthorizedPage({ allowedRoles = [] }) {
  const { role, user } = useAuth();

  const formattedUserRole = role || 'UNSPECIFIED';
  const formattedAllowed = allowedRoles.length > 0 ? allowedRoles.join(', ') : 'Restricted Role';

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-md w-full bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-sm text-center space-y-6"
      >
        {/* Lock Icon Header */}
        <div className="relative w-16 h-16 mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[#D96C6C]/10 border border-[#D96C6C]/20 flex items-center justify-center text-[#D96C6C]">
            <Lock className="w-8 h-8 stroke-[1.75]" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#D96C6C] text-white flex items-center justify-center shadow-xs">
            <ShieldAlert className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Title & Badge */}
        <div className="space-y-2">
          <span className="px-3 py-1 bg-[#D96C6C]/10 text-[#D96C6C] text-[11px] font-mono font-bold rounded-full uppercase tracking-wider">
            HTTP 403 Access Denied
          </span>
          <h1 className="text-xl font-bold text-[#2B2B2B]">Restricted Module</h1>
          <p className="text-xs text-[#6B7280] leading-relaxed">
            You do not have permission to view or access this section of TrustGraph.
          </p>
        </div>

        {/* Diagnostic Metadata Box */}
        <div className="p-4 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl text-left text-xs font-mono space-y-2">
          <div className="flex justify-between items-center text-[#6B7280]">
            <span>Your Active Role:</span>
            <strong className="text-[#D96C6C] font-semibold">{formattedUserRole}</strong>
          </div>
          <div className="flex justify-between items-center text-[#6B7280]">
            <span>Required Role(s):</span>
            <strong className="text-[#2B2B2B] font-semibold">{formattedAllowed}</strong>
          </div>
          <div className="flex justify-between items-center text-[#6B7280] border-t border-[#E5E7EB] pt-2 mt-2">
            <span>Account Session:</span>
            <span className="text-[#2B2B2B] truncate max-w-[160px]">{user?.email || 'Authenticated'}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <NavLink
            to="/dashboard"
            className="flex-1 py-2.5 px-4 bg-[#8E9A7D] hover:bg-[#7F8F73] text-white font-semibold rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </NavLink>
          <NavLink
            to="/dashboard/profile"
            className="py-2.5 px-4 bg-[#F8F7F4] hover:bg-[#F3F2EF] border border-[#E5E7EB] text-[#2B2B2B] font-semibold rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors"
          >
            <User className="w-4 h-4 text-[#6B7280]" />
            <span>Profile</span>
          </NavLink>
        </div>
      </motion.div>
    </div>
  );
}
