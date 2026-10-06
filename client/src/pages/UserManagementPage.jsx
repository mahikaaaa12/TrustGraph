import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Shield,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Sparkles,
  UserCheck,
  Lock,
} from 'lucide-react';

export default function UserManagementPage() {
  const { user: currentUser, updateToken } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Confirmation Modal State
  const [pendingChange, setPendingChange] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/users');
      if (res.data?.success && res.data?.data?.users) {
        setUsers(res.data.data.users);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch user accounts list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleSelect = (targetUser, newRole) => {
    if (targetUser.role === newRole) return;
    setPendingChange({
      user: targetUser,
      newRole,
    });
  };

  const confirmRoleChange = async () => {
    if (!pendingChange) return;

    setIsUpdating(true);
    setError(null);
    setSuccessMsg('');

    try {
      const { user: targetUser, newRole } = pendingChange;
      const res = await api.patch(`/users/${targetUser._id}/role`, { role: newRole });

      if (res.data?.success) {
        const updatedUser = res.data.data.user;
        const freshToken = res.data.data.token;

        // If updating logged-in admin's own session token
        if (freshToken && String(currentUser?._id) === String(targetUser._id)) {
          updateToken(freshToken);
        }

        setSuccessMsg(`Successfully updated ${updatedUser.name}'s role to ${updatedUser.role}.`);
        setPendingChange(null);
        await fetchUsers();
      }
    } catch (err) {
      setError(err.message || 'Failed to update user role.');
      setPendingChange(null);
    } finally {
      setIsUpdating(false);
    }
  };

  const roleBadgeStyles = {
    ADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
    INDUSTRY_ANALYST: 'bg-[#5B8C5A]/15 text-[#5B8C5A] border-[#5B8C5A]/20',
    CONTENT_CREATOR: 'bg-amber-100 text-amber-800 border-amber-200',
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#2B2B2B] tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-[#8E9A7D]" />
            <span>Admin User & Role Management</span>
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Manage system users, assign Role-Based Access Control (RBAC) permissions, and enforce security policies.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-white border border-[#E5E7EB] px-3.5 py-2 rounded-xl shadow-xs text-xs font-mono">
          <Shield className="w-4 h-4 text-[#8E9A7D]" />
          <span className="text-[#6B7280]">
            System Admins: <strong className="text-[#2B2B2B]">{users.filter((u) => u.role === 'ADMIN').length} Active</strong>
          </span>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-[#5B8C5A]/10 border border-[#5B8C5A]/30 rounded-2xl text-xs text-[#5B8C5A] font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-[#D96C6C]/10 border border-[#D96C6C]/30 rounded-2xl text-xs text-[#D96C6C] font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-4">
        <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-3">
          <div>
            <h3 className="text-base font-bold text-[#2B2B2B]">Registered Platform Users</h3>
            <p className="text-xs text-[#6B7280]">View account privileges and modify logical system roles</p>
          </div>
          <span className="text-xs font-mono text-[#9CA3AF]">{users.length} Total Users</span>
        </div>

        {loading ? (
          <div className="p-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#8E9A7D] animate-spin mx-auto" />
            <p className="text-xs font-mono text-[#6B7280]">Loading user accounts database...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F7F4] text-[#6B7280] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 rounded-l-xl">User Identity</th>
                  <th className="p-3.5">Email Address</th>
                  <th className="p-3.5">Current RBAC Role</th>
                  <th className="p-3.5">Account Status</th>
                  <th className="p-3.5 rounded-r-xl text-right">Assign New Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {users.map((u) => {
                  const isCurrentSessionUser = String(u._id) === String(currentUser?._id);

                  return (
                    <tr key={u._id} className="hover:bg-[#F8F7F4] transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-[#8E9A7D]/20 text-[#7F8F73] font-bold flex items-center justify-center text-xs">
                            {u.name?.[0] || 'U'}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-[#2B2B2B]">{u.name}</span>
                            {isCurrentSessionUser && (
                              <span className="text-[10px] text-[#8E9A7D] font-mono font-semibold">
                                (Your Active Session)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 text-[#6B7280] font-mono">{u.email}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase border ${
                            roleBadgeStyles[u.role] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center space-x-1 text-[#5B8C5A] font-semibold text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#5B8C5A]" />
                          <span className="capitalize">{u.status || 'Active'}</span>
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleSelect(u, e.target.value)}
                          className="px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#2B2B2B] font-medium focus:outline-none focus:border-[#8E9A7D] transition-colors cursor-pointer"
                        >
                          <option value="INDUSTRY_ANALYST">Industry Analyst</option>
                          <option value="CONTENT_CREATOR">Content Creator</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role Change Confirmation Modal */}
      <AnimatePresence>
        {pendingChange && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="max-w-md w-full bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xl space-y-5"
            >
              <div className="flex items-center space-x-3 text-[#D9A441]">
                <div className="p-3 bg-[#D9A441]/10 rounded-xl">
                  <AlertTriangle className="w-6 h-6 stroke-[1.75]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2B2B2B]">Confirm Role Change</h3>
                  <p className="text-xs text-[#6B7280]">Role modification requires administrator confirmation</p>
                </div>
              </div>

              <div className="p-4 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl text-xs space-y-2">
                <p className="text-[#2B2B2B] font-medium">
                  Are you sure you want to change <strong>{pendingChange.user.name}</strong>'s role from{' '}
                  <span className="font-mono text-[#D96C6C]">{pendingChange.user.role}</span> to{' '}
                  <span className="font-mono text-[#5B8C5A]">{pendingChange.newRole}</span>?
                </p>

                {pendingChange.newRole === 'ADMIN' && (
                  <div className="mt-2 p-2.5 bg-purple-50 border border-purple-200 rounded-lg text-purple-900 text-[11px] font-medium flex items-start gap-2">
                    <Shield className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                    <span>
                      <strong>Warning:</strong> Promoting this account to Administrator grants unrestricted system privileges across all modules and audit configurations.
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPendingChange(null)}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-[#F8F7F4] hover:bg-[#F3F2EF] border border-[#E5E7EB] text-[#2B2B2B] font-semibold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmRoleChange}
                  disabled={isUpdating}
                  className="px-5 py-2 bg-[#8E9A7D] hover:bg-[#7F8F73] text-white font-semibold rounded-xl text-xs flex items-center space-x-2 transition-colors shadow-xs"
                >
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  <span>Confirm Role Change</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
