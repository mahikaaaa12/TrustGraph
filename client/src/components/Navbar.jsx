import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  FaSearch,
  FaBell,
  FaCheckCircle,
  FaExclamationCircle,
  FaUserCircle,
  FaShieldAlt,
} from 'react-icons/fa';

export default function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [healthStatus, setHealthStatus] = useState('connected');
  const [showNotifications, setShowNotifications] = useState(false);

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
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (searchQuery.toLowerCase().includes('http')) {
      navigate(`/website?url=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate(`/history?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Search Input Bar */}
      <form onSubmit={handleSearchSubmit} className="relative w-72 md:w-96">
        <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search domain, URL, hash, or entity..."
          className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-mono"
        />
      </form>

      {/* Right Navbar Controls */}
      <div className="flex items-center space-x-5">
        {/* Live Cluster Telemetry Indicator */}
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-950 border border-slate-800 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              healthStatus === 'connected'
                ? 'bg-emerald-400 animate-pulse'
                : healthStatus === 'degraded'
                ? 'bg-amber-400 animate-ping'
                : 'bg-rose-500'
            }`}
          />
          <span className="text-slate-400 font-mono text-[11px] uppercase">
            Atlas Cluster: <strong className="text-white capitalize">{healthStatus}</strong>
          </span>
        </div>

        {/* Notifications Dropdown Trigger */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="System Alerts"
          >
            <FaBell size={15} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center border border-slate-900">
              3
            </span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 space-y-3 z-50">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-white">System Security Alerts</span>
                <NavLink
                  to="/notifications"
                  onClick={() => setShowNotifications(false)}
                  className="text-[11px] text-blue-400 hover:underline"
                >
                  View All
                </NavLink>
              </div>
              <div className="space-y-2">
                <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs space-y-1">
                  <span className="text-rose-400 font-semibold flex items-center space-x-1">
                    <FaExclamationCircle />
                    <span>Suspicious EXE Hash Uploaded</span>
                  </span>
                  <p className="text-slate-400 text-[11px]">Flagged 3 mins ago in Document Analyzer</p>
                </div>
                <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs space-y-1">
                  <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                    <FaCheckCircle />
                    <span>SSL Certificate Validated</span>
                  </span>
                  <p className="text-slate-400 text-[11px]">Domain google.com scored 98% Trust Score</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Badge */}
        <NavLink
          to="/profile"
          className="flex items-center space-x-2.5 p-1.5 pl-2.5 pr-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
        >
          <FaUserCircle className="text-blue-400 text-lg" />
          <span className="text-xs font-semibold text-white hidden md:inline">
            {user?.name || 'Analyst Session'}
          </span>
        </NavLink>
      </div>
    </header>
  );
}
