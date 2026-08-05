import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
  FaChartPie,
  FaFileAlt,
  FaImage,
  FaGlobe,
  FaFont,
  FaShieldAlt,
  FaHistory,
  FaFileExport,
  FaTerminal,
  FaExclamationTriangle,
  FaBell,
  FaCog,
  FaUser,
  FaSignOutAlt,
  FaChevronLeft,
  FaChevronRight,
  FaHome,
} from 'react-icons/fa';

export default function Sidebar({ isCollapsed, toggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navSections = [
    {
      title: 'OVERVIEW',
      items: [
        { name: 'Dashboard Home', path: '/dashboard', icon: FaChartPie },
      ],
    },
    {
      title: 'AI ANALYZERS',
      items: [
        { name: 'Document Analyzer', path: '/dashboard/document', icon: FaFileAlt },
        { name: 'Image Forensics', path: '/dashboard/image', icon: FaImage },
        { name: 'Website Security', path: '/dashboard/website', icon: FaGlobe },
        { name: 'Text Authenticity', path: '/dashboard/text', icon: FaFont },
      ],
    },
    {
      title: 'INTELLIGENCE',
      items: [
        { name: 'Trust Score Engine', path: '/dashboard/trust-score', icon: FaShieldAlt },
        { name: 'Audit History', path: '/dashboard/history', icon: FaHistory },
        { name: 'Executive Reports', path: '/dashboard/reports', icon: FaFileExport },
      ],
    },
    {
      title: 'SYSTEM & DEV',
      items: [
        { name: 'API Tester', path: '/dashboard/api-tester', icon: FaTerminal },
        { name: 'System Error Logs', path: '/dashboard/error-logs', icon: FaExclamationTriangle },
        { name: 'Notifications', path: '/dashboard/notifications', icon: FaBell, badge: '3' },
        { name: 'Settings', path: '/dashboard/settings', icon: FaCog },
        { name: 'User Profile', path: '/dashboard/profile', icon: FaUser },
      ],
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 80 : 260 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="relative flex flex-col h-screen bg-slate-900 border-r border-slate-800 shadow-2xl z-30 select-none flex-shrink-0"
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800/80">
        <NavLink to="/dashboard" className="flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 flex-shrink-0">
            <FaShieldAlt className="text-xl" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-base font-bold text-white tracking-wide">TrustGraph</span>
              <span className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase">Enterprise Portal</span>
            </div>
          )}
        </NavLink>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <FaChevronRight size={12} /> : <FaChevronLeft size={12} />}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!isCollapsed && (
              <h3 className="px-3 text-[10px] font-semibold text-slate-500 tracking-wider uppercase">
                {section.title}
              </h3>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/dashboard'}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 font-semibold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`
                  }
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`text-base flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                    {!isCollapsed && <span>{item.name}</span>}
                  </div>
                  {!isCollapsed && item.badge && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      {/* Back to Public SaaS Site */}
      <div className="px-3 py-2 border-t border-slate-800/60">
        <NavLink
          to="/"
          className="flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
        >
          <FaHome className="text-sm flex-shrink-0" />
          {!isCollapsed && <span>Public SaaS Website</span>}
        </NavLink>
      </div>

      {/* User Footer / Logout */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
        {!isCollapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs">
                {user?.name?.[0] || 'A'}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-white truncate">{user?.name || 'Analyst Session'}</span>
                <span className="text-[10px] text-slate-400 truncate capitalize">{user?.role || 'Enterprise User'}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
              title="Logout Session"
            >
              <FaSignOutAlt size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full py-2 flex items-center justify-center text-slate-400 hover:text-rose-400 transition-colors"
            title="Logout Session"
          >
            <FaSignOutAlt size={16} />
          </button>
        )}
      </div>
    </motion.aside>
  );
}
