import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { AlertCircle, CheckCircle, Info, CheckCheck, Loader2 } from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/notifications?limit=50');
      if (res.data?.success) {
        setNotifications(res.data.data.notifications || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      fetchNotifications();
    } catch (err) {
      // Silent error
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2B2B2B] tracking-tight">Security Notifications & System Alerts</h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Operational alert feed capturing real-time security triggers, threat warnings, and cluster status updates.
          </p>
        </div>

        {notifications.some((n) => !n.read) && (
          <button
            onClick={handleMarkAllRead}
            className="px-4 py-2.5 bg-[#8E9A7D] hover:bg-[#7F8F73] text-white text-xs font-semibold rounded-xl transition-colors flex items-center space-x-2 shadow-xs self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-16 text-center space-y-3 bg-white rounded-2xl border border-[#E5E7EB]">
          <Loader2 className="w-8 h-8 text-[#8E9A7D] animate-spin mx-auto" />
          <p className="text-xs font-mono text-[#6B7280]">Loading notification records...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-[#D96C6C]/10 border border-[#D96C6C]/30 rounded-2xl text-xs text-[#D96C6C]">
          {error}
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-16 bg-white border border-[#E5E7EB] rounded-2xl text-center text-[#9CA3AF] text-xs space-y-2 shadow-xs">
          <p className="font-semibold text-[#2B2B2B]">No notifications recorded yet.</p>
          <p className="text-[#6B7280]">Notifications will appear here automatically when security evaluations run!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((n) => (
            <div
              key={n._id}
              className={`p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs flex items-start space-x-4 transition-all ${
                !n.read ? 'border-l-4 border-l-[#8E9A7D]' : 'opacity-80'
              }`}
            >
              <div
                className={`p-2.5 rounded-xl ${
                  n.severity === 'critical'
                    ? 'bg-[#D96C6C]/15 text-[#D96C6C]'
                    : n.severity === 'warning'
                    ? 'bg-[#D9A441]/15 text-[#D9A441]'
                    : 'bg-[#5B8C5A]/15 text-[#5B8C5A]'
                }`}
              >
                {n.severity === 'critical' ? (
                  <AlertCircle className="w-5 h-5 stroke-[1.75]" />
                ) : n.severity === 'warning' ? (
                  <AlertCircle className="w-5 h-5 stroke-[1.75]" />
                ) : (
                  <CheckCircle className="w-5 h-5 stroke-[1.75]" />
                )}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-[#2B2B2B]">{n.title}</h3>
                  <span className="text-[11px] text-[#9CA3AF] font-mono">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-[#6B7280]">{n.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
