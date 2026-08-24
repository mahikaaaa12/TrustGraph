import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useErrorLogs } from '../context/ErrorLogContext';
import api from '../services/api';
import {
  User,
  Shield,
  Key,
  Lock,
  Smartphone,
  History,
  Bell,
  Trash2,
  LogOut,
  CheckCircle,
  AlertTriangle,
  Clock,
  Laptop,
  Check,
  X,
  Edit2,
  Save,
  Loader2,
  ShieldAlert,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, logout, updateUser, updateToken } = useAuth();
  const { showToast } = useErrorLogs();

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(null);

  // Preferences State
  const [preferences, setPreferences] = useState(
    user?.preferences || {
      emailNotifications: true,
      securityAlerts: true,
      riskAnalysisAlerts: true,
      reportNotifications: true,
    }
  );
  const [savingPreferences, setSavingPreferences] = useState(false);

  // Login Activity State
  const [loginActivity, setLoginActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  // Delete Account Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    if (user?.name) setProfileName(user.name);
    if (user?.preferences) setPreferences(user.preferences);

    const fetchActivity = async () => {
      try {
        const res = await api.get('/auth/login-activity');
        if (res.data?.success && res.data.data?.activity) {
          setLoginActivity(res.data.data.activity);
        }
      } catch (err) {
        console.warn('Could not fetch login activity:', err);
      } finally {
        setLoadingActivity(false);
      }
    };

    fetchActivity();
  }, [user]);

  // Handle Profile Update
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileName.trim()) {
      showToast('Name cannot be empty.', 'error');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await api.patch('/auth/me', { name: profileName.trim() });
      if (res.data?.success) {
        updateUser(res.data.data.user);
        setIsEditingProfile(false);
        showToast('Profile updated successfully.', 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    // Frontend complexity check
    const minLen = newPassword.length >= 8;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNum = /[0-9]/.test(newPassword);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);

    if (!minLen || !hasUpper || !hasLower || !hasNum || !hasSpecial) {
      setPasswordError(
        'Password does not meet the security requirements: Minimum 8 characters with uppercase, lowercase, number, and special character.'
      );
      return;
    }

    setSavingPassword(true);
    try {
      const res = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (res.data?.success) {
        if (res.data.data?.token) {
          updateToken(res.data.data.token);
        }
        setPasswordSuccess('Password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showToast('Password changed successfully.', 'success');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to change password.';
      setPasswordError(msg);
      showToast(msg, 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  // Handle Preferences Toggle
  const handleTogglePreference = async (key) => {
    const updated = {
      ...preferences,
      [key]: !preferences[key],
    };
    setPreferences(updated);
    setSavingPreferences(true);

    try {
      const res = await api.patch('/auth/preferences', updated);
      if (res.data?.success) {
        updateUser({ preferences: updated });
        showToast('Preferences saved.', 'success');
      }
    } catch (err) {
      showToast('Failed to save preferences.', 'error');
    } finally {
      setSavingPreferences(false);
    }
  };

  // Handle Account Deletion
  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!deletePassword) {
      setDeleteError('Password confirmation is required.');
      return;
    }

    setDeletingAccount(true);
    setDeleteError(null);

    try {
      const res = await api.post('/auth/delete-account', { password: deletePassword });
      if (res.data?.success) {
        showToast('Your account has been deleted.', 'info');
        logout();
      }
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to delete account.');
    } finally {
      setDeletingAccount(false);
    }
  };

  const getPasswordStrength = () => {
    if (!newPassword) return null;
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) score++;

    if (score <= 2) return { label: 'Weak', color: 'text-[#D96C6C]', bg: 'bg-[#D96C6C]' };
    if (score === 3) return { label: 'Medium', color: 'text-[#D9A441]', bg: 'bg-[#D9A441]' };
    return { label: 'Strong', color: 'text-[#5B8C5A]', bg: 'bg-[#5B8C5A]' };
  };

  const strength = getPasswordStrength();

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#2B2B2B] tracking-tight">Account & Security Center</h1>
        <p className="text-xs text-[#6B7280] mt-1">
          Manage your analyst identity, security credentials, active sessions, and communication preferences.
        </p>
      </div>

      {/* 1. Account Information Card */}
      <div className="p-8 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-[#E5E7EB] pb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-[#8E9A7D]/20 text-[#7F8F73] border border-[#8E9A7D]/30 flex items-center justify-center font-extrabold text-2xl">
              {user?.name?.[0] || 'U'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-[#2B2B2B]">{user?.name || 'Security Analyst'}</h2>
                <span className="w-2 h-2 rounded-full bg-[#5B8C5A]" title="Account Active" />
              </div>
              <p className="text-xs text-[#6B7280] font-mono">{user?.email || 'analyst@trustgraph.org'}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="px-3.5 py-1.5 rounded-full bg-[#F8F7F4] text-[#7F8F73] border border-[#E5E7EB] text-xs font-semibold uppercase tracking-wider">
              {user?.role || 'analyst'} Role
            </span>
            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="px-3 py-1.5 bg-[#F8F7F4] hover:bg-[#E5E7EB] text-[#2B2B2B] text-xs font-semibold rounded-xl border border-[#E5E7EB] transition-colors flex items-center space-x-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{isEditingProfile ? 'Cancel' : 'Edit Profile'}</span>
            </button>
          </div>
        </div>

        {/* Inline Profile Edit Form */}
        {isEditingProfile && (
          <form onSubmit={handleSaveProfile} className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-3">
            <h3 className="text-xs font-bold text-[#2B2B2B]">Edit Display Name:</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Full Name"
                className="flex-1 px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#2B2B2B] font-mono focus:outline-none focus:border-[#8E9A7D]"
              />
              <button
                type="submit"
                disabled={savingProfile}
                className="px-4 py-2 bg-[#8E9A7D] hover:bg-[#7F8F73] disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center space-x-1.5 shadow-xs"
              >
                {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Changes</span>
              </button>
            </div>
            <p className="text-[11px] text-[#9CA3AF]">
              Note: Email address, Analyst Role, and Account ID are fixed security identifiers and cannot be altered.
            </p>
          </form>
        )}

        {/* Account Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1">
            <span className="text-[#9CA3AF] text-[11px]">Account ID</span>
            <p className="text-[#2B2B2B] truncate font-bold">{user?._id || 'acc_66b0e81ac8e2'}</p>
          </div>
          <div className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1">
            <span className="text-[#9CA3AF] text-[11px]">Account Status</span>
            <p className="text-[#5B8C5A] font-bold uppercase">{user?.status || 'Active'}</p>
          </div>
          <div className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1">
            <span className="text-[#9CA3AF] text-[11px]">Created Date</span>
            <p className="text-[#2B2B2B] font-bold">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'August 2026'}
            </p>
          </div>
          <div className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1">
            <span className="text-[#9CA3AF] text-[11px]">Trust Level</span>
            <p className="text-[#5B8C5A] font-bold">{user?.trustLevelScore || 50}.0 / 100</p>
          </div>
        </div>
      </div>

      {/* 2. Security Overview & Change Password Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Security Status Summary */}
        <div className="p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-[#2B2B2B] font-bold text-sm border-b border-[#E5E7EB] pb-3">
            <Shield className="w-4 h-4 text-[#8E9A7D]" />
            <span>Account Security Status</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] flex items-center justify-between">
              <span className="text-[#6B7280]">Password Strength</span>
              <span className="font-semibold text-[#5B8C5A] flex items-center space-x-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Encrypted (bcrypt)</span>
              </span>
            </div>

            <div className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] flex items-center justify-between">
              <span className="text-[#6B7280]">Authentication</span>
              <span className="font-semibold text-[#5B8C5A]">JWT (HMAC-SHA256)</span>
            </div>

            <div className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] flex items-center justify-between">
              <span className="text-[#6B7280]">Session Status</span>
              <span className="font-semibold text-[#5B8C5A] flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-[#5B8C5A]" />
                <span>Active</span>
              </span>
            </div>

            <div className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] flex items-center justify-between">
              <span className="text-[#6B7280]">Two-Factor Auth</span>
              <span className="font-semibold text-[#9CA3AF]">Not Configured</span>
            </div>

            <div className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] flex items-center justify-between font-mono text-[11px]">
              <span className="text-[#6B7280]">Last Password Change</span>
              <span className="text-[#2B2B2B]">
                {user?.lastPasswordChangeAt
                  ? new Date(user.lastPasswordChangeAt).toLocaleDateString()
                  : 'Recent'}
              </span>
            </div>
          </div>
        </div>

        {/* Change Password Form (2 Columns Wide on LG) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-[#2B2B2B] font-bold text-sm border-b border-[#E5E7EB] pb-3">
            <Lock className="w-4 h-4 text-[#8E9A7D]" />
            <span>Change Security Password</span>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
            {passwordError && (
              <div className="p-3 bg-[#D96C6C]/10 border border-[#D96C6C]/30 rounded-xl text-[#D96C6C] flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 bg-[#5B8C5A]/10 border border-[#5B8C5A]/30 rounded-xl text-[#5B8C5A] flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <div>
              <label className="block text-[#6B7280] font-medium mb-1">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3.5 py-2 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl text-xs text-[#2B2B2B] font-mono focus:outline-none focus:border-[#8E9A7D]"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-2.5 text-[#9CA3AF] hover:text-[#2B2B2B]"
                >
                  {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#6B7280] font-medium mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full px-3.5 py-2 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl text-xs text-[#2B2B2B] font-mono focus:outline-none focus:border-[#8E9A7D]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-[#9CA3AF] hover:text-[#2B2B2B]"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[#6B7280] font-medium mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-3.5 py-2 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl text-xs text-[#2B2B2B] font-mono focus:outline-none focus:border-[#8E9A7D]"
                />
              </div>
            </div>

            {/* Password Strength Indicator */}
            {strength && (
              <div className="flex items-center space-x-2 pt-1 text-[11px]">
                <span className="text-[#9CA3AF]">Strength:</span>
                <span className={`font-semibold ${strength.color}`}>{strength.label}</span>
                <div className="flex-1 h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${strength.bg}`}
                    style={{
                      width: strength.label === 'Strong' ? '100%' : strength.label === 'Medium' ? '66%' : '33%',
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingPassword}
                className="px-4 py-2 bg-[#8E9A7D] hover:bg-[#7F8F73] disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors flex items-center space-x-1.5 shadow-xs"
              >
                {savingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Update Password</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 3. Session Management & 2FA Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Session Management */}
        <div className="p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <div className="flex items-center space-x-2 text-[#2B2B2B] font-bold text-sm">
              <Key className="w-4 h-4 text-[#8E9A7D]" />
              <span>Active Security Session</span>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#5B8C5A]/15 text-[#5B8C5A] text-[10px] font-bold">
              Active
            </span>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] flex items-center justify-between">
              <span className="text-[#6B7280]">Authentication Type</span>
              <span className="text-[#2B2B2B] font-semibold">JWT Bearer Token</span>
            </div>
            <div className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] flex items-center justify-between">
              <span className="text-[#6B7280]">Client Environment</span>
              <span className="text-[#2B2B2B] flex items-center space-x-1">
                <Laptop className="w-3.5 h-3.5 text-[#8E9A7D]" />
                <span>Web Browser Session</span>
              </span>
            </div>
            <div className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] flex items-center justify-between">
              <span className="text-[#6B7280]">Session Lifetime</span>
              <span className="text-[#2B2B2B]">24 Hours (Rolling Expiry)</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <button
              onClick={logout}
              className="flex-1 px-3 py-2 bg-[#F8F7F4] hover:bg-[#E5E7EB] text-[#2B2B2B] text-xs font-semibold rounded-xl border border-[#E5E7EB] transition-colors flex items-center justify-center space-x-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out This Session</span>
            </button>
          </div>
        </div>

        {/* Two-Factor Authentication Info */}
        <div className="p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <div className="flex items-center space-x-2 text-[#2B2B2B] font-bold text-sm">
              <Smartphone className="w-4 h-4 text-[#8E9A7D]" />
              <span>Two-Factor Authentication (2FA)</span>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#9CA3AF]/15 text-[#6B7280] text-[10px] font-bold">
              Disabled
            </span>
          </div>

          <p className="text-xs text-[#6B7280] leading-relaxed">
            Two-factor authentication adds an extra layer of defense by requiring an authenticator code or SMS token in addition to your password.
          </p>

          <div className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] text-xs text-[#9CA3AF] italic">
            Two-factor authentication is not currently configured for this deployment environment.
          </div>
        </div>
      </div>

      {/* 4. Recent Login Activity */}
      <div className="p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
          <div className="flex items-center space-x-2 text-[#2B2B2B] font-bold text-sm">
            <History className="w-4 h-4 text-[#8E9A7D]" />
            <span>Recent Login Activity</span>
          </div>
          <span className="text-[11px] text-[#9CA3AF] font-mono">Last 10 Events</span>
        </div>

        {loadingActivity ? (
          <div className="p-8 text-center text-xs text-[#6B7280]">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#8E9A7D] mb-2" />
            <span>Loading activity history...</span>
          </div>
        ) : loginActivity.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-[#9CA3AF] text-[11px] uppercase">
                  <th className="pb-2 font-medium">Timestamp</th>
                  <th className="pb-2 font-medium">IP Address</th>
                  <th className="pb-2 font-medium">Device / User Agent</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] font-mono">
                {loginActivity.map((log, index) => (
                  <tr key={index} className="hover:bg-[#F8F7F4]/50">
                    <td className="py-2.5 text-[#2B2B2B]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 text-[#6B7280]">{log.ip || '127.0.0.1'}</td>
                    <td className="py-2.5 text-[#6B7280] max-w-[200px] truncate" title={log.userAgent}>
                      {log.userAgent || 'Browser'}
                    </td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded-md bg-[#5B8C5A]/15 text-[#5B8C5A] text-[10px] font-bold">
                        {log.status || 'Successful'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 bg-[#F8F7F4] rounded-xl text-center text-xs text-[#6B7280]">
            No previous login records found.
          </div>
        )}
      </div>

      {/* 5. Account Preferences */}
      <div className="p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-4">
        <div className="flex items-center space-x-2 text-[#2B2B2B] font-bold text-sm border-b border-[#E5E7EB] pb-3">
          <Bell className="w-4 h-4 text-[#8E9A7D]" />
          <span>Notification & Communication Preferences</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {[
            { key: 'emailNotifications', title: 'Email Notifications', desc: 'Receive audit updates via email' },
            { key: 'securityAlerts', title: 'Security Alerts', desc: 'Immediate notification on high/critical anomalies' },
            { key: 'riskAnalysisAlerts', title: 'Risk Analysis Updates', desc: 'Alerts when background risk pipelines finish' },
            { key: 'reportNotifications', title: 'Executive Report Alerts', desc: 'Notify when new audit reports are generated' },
          ].map(({ key, title, desc }) => (
            <div
              key={key}
              onClick={() => handleTogglePreference(key)}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start justify-between ${
                preferences[key]
                  ? 'bg-[#8E9A7D]/10 border-[#8E9A7D]/40'
                  : 'bg-[#F8F7F4] border-[#E5E7EB] opacity-70'
              }`}
            >
              <div>
                <p className="font-semibold text-[#2B2B2B]">{title}</p>
                <p className="text-[11px] text-[#6B7280] mt-0.5">{desc}</p>
              </div>
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                  preferences[key]
                    ? 'bg-[#8E9A7D] text-white border-[#8E9A7D]'
                    : 'bg-white border-[#E5E7EB]'
                }`}
              >
                {preferences[key] && <Check className="w-3.5 h-3.5" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Danger Zone */}
      <div className="p-6 rounded-2xl bg-white border border-[#D96C6C]/30 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 text-[#D96C6C] font-bold text-sm border-b border-[#D96C6C]/20 pb-3">
          <ShieldAlert className="w-4 h-4" />
          <span>Danger Zone</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold text-[#2B2B2B]">Permanent Account Deletion</h4>
            <p className="text-[11px] text-[#6B7280] mt-0.5">
              Permanently delete your user profile and associated account credentials. This action cannot be undone.
            </p>
          </div>

          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-4 py-2 bg-[#D96C6C] hover:bg-[#C25858] text-white text-xs font-semibold rounded-xl transition-colors flex items-center space-x-1.5 self-start sm:self-auto shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Account</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-[#E5E7EB] shadow-lg">
            <div className="flex items-center space-x-2 text-[#D96C6C] font-bold text-base">
              <AlertTriangle className="w-5 h-5" />
              <span>Confirm Permanent Account Deletion</span>
            </div>

            <p className="text-xs text-[#6B7280] leading-relaxed">
              Are you sure you want to delete your account? All analyst profile data will be permanently removed. Enter your password to proceed:
            </p>

            {deleteError && (
              <div className="p-3 bg-[#D96C6C]/10 border border-[#D96C6C]/30 rounded-xl text-[#D96C6C] text-xs">
                {deleteError}
              </div>
            )}

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full px-3.5 py-2 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl text-xs text-[#2B2B2B] font-mono focus:outline-none focus:border-[#D96C6C]"
              />

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeletePassword('');
                    setDeleteError(null);
                  }}
                  className="px-4 py-2 bg-[#F8F7F4] hover:bg-[#E5E7EB] text-[#2B2B2B] text-xs font-semibold rounded-xl border border-[#E5E7EB]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deletingAccount}
                  className="px-4 py-2 bg-[#D96C6C] hover:bg-[#C25858] disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-xs"
                >
                  {deletingAccount && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Delete</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
