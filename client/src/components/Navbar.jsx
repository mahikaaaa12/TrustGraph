import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Search, Bell, User, CheckCircle, AlertCircle, Shield, Info } from 'lucide-react';

export default function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [healthStatus, setHealthStatus] = useState('connected');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await api.get('/health');
        if (res.data?.database === 'connected') {
          setHealthStatus('connected');
        } else {
          setHealthStatus('degraded');
        }
      } catch (err) {
        setHealthStatus('disconnected');
      }
    };

    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notifications?limit=5');
        if (res.data?.success) {
          setNotifications(res.data.data.notifications || []);
          setUnreadCount(res.data.data.unreadCount || 0);
        }
      } catch (err) {
        // Silent catch
      }
    };

    checkStatus();
    fetchNotifications();

    const interval = setInterval(() => {
      checkStatus();
      fetchNotifications();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (searchQuery.toLowerCase().includes('http')) {
      navigate(`/dashboard/website?url=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate(`/dashboard/history?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-[#E5E7EB] px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Search Input Bar */}
      <form onSubmit={handleSearchSubmit} className="relative w-72 md:w-96">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] w-4 h-4 stroke-[1.5]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search domain, entity, or analysis history..."
          className="w-full pl-10 pr-4 py-2 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl text-xs text-[#2B2B2B] placeholder-[#9CA3AF] focus:outline-none focus:border-[#8E9A7D] focus:ring-2 focus:ring-[#8E9A7D]/20 transition-all font-mono"
        />
      </form>

      {/* Right Navbar Controls */}
      <div className="flex items-center space-x-4">
        {/* Cluster Telemetry Status Badge */}
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#F8F7F4] border border-[#E5E7EB] text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              healthStatus === 'connected'
                ? 'bg-[#5B8C5A]'
                : healthStatus === 'degraded'
                ? 'bg-[#D9A441]'
                : 'bg-[#D96C6C]'
            }`}
          />
          <span className="text-[#6B7280] font-mono text-[11px] uppercase">
            Atlas Cluster: <strong className="text-[#2B2B2B] capitalize">{healthStatus}</strong>
          </span>
        </div>

        {/* Notifications Trigger */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl bg-[#F8F7F4] border border-[#E5E7EB] text-[#6B7280] hover:text-[#2B2B2B] transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4 stroke-[1.75]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#D96C6C] text-white rounded-full text-[10px] font-bold flex items-center justify-center border border-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white border border-[#E5E7EB] rounded-2xl shadow-xl p-4 space-y-3 z-50">
              <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-2">
                <span className="text-xs font-bold text-[#2B2B2B]">System Security Alerts</span>
                <NavLink
                  to="/dashboard/notifications"
                  onClick={() => setShowNotifications(false)}
                  className="text-[11px] text-[#7F8F73] hover:underline"
                >
                  View All
                </NavLink>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-[#9CA3AF] text-center py-4">No notifications recorded.</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      className="p-2.5 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] text-xs space-y-1"
                    >
                      <span
                        className={`font-semibold flex items-center space-x-1 ${
                          n.severity === 'critical'
                            ? 'text-[#D96C6C]'
                            : n.severity === 'warning'
                            ? 'text-[#D9A441]'
                            : 'text-[#5B8C5A]'
                        }`}
                      >
                        {n.severity === 'critical' ? (
                          <AlertCircle className="w-3.5 h-3.5 stroke-[1.75]" />
                        ) : (
                          <CheckCircle className="w-3.5 h-3.5 stroke-[1.75]" />
                        )}
                        <span className="truncate">{n.title}</span>
                      </span>
                      <p className="text-[#6B7280] text-[11px] line-clamp-2">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Badge */}
        <NavLink
          to="/dashboard/profile"
          className="flex items-center space-x-2.5 p-1.5 pl-2.5 pr-3 rounded-xl bg-[#F8F7F4] border border-[#E5E7EB] hover:bg-[#F3F2EF] transition-colors"
        >
          <div className="w-6 h-6 rounded-full bg-[#8E9A7D] text-white flex items-center justify-center font-bold text-xs">
            {user?.name?.[0] || 'A'}
          </div>
          <span className="text-xs font-semibold text-[#2B2B2B] hidden md:inline">
            {user?.name || 'Analyst Session'}
          </span>
        </NavLink>
      </div>
    </header>
  );
}
