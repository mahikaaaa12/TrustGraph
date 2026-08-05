import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
  Shield,
  PieChart,
  FileText,
  Image,
  Globe,
  Type,
  Award,
  Clock,
  FileSpreadsheet,
  Terminal,
  AlertTriangle,
  Bell,
  Settings,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Home,
} from 'lucide-react';

export default function Sidebar({ isCollapsed, toggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navSections = [
    {
      title: 'OVERVIEW',
      items: [
        { name: 'Dashboard Home', path: '/dashboard', icon: PieChart },
      ],
    },
    {
      title: 'AI ANALYZERS',
      items: [
        { name: 'Document Analyzer', path: '/dashboard/document', icon: FileText },
        { name: 'Image Forensics', path: '/dashboard/image', icon: Image },
        { name: 'Website Security', path: '/dashboard/website', icon: Globe },
        { name: 'Text Authenticity', path: '/dashboard/text', icon: Type },
      ],
    },
    {
      title: 'INTELLIGENCE',
      items: [
        { name: 'Trust Score Engine', path: '/dashboard/trust-score', icon: Award },
        { name: 'Audit History', path: '/dashboard/history', icon: Clock },
        { name: 'Executive Reports', path: '/dashboard/reports', icon: FileSpreadsheet },
      ],
    },
    {
      title: 'SYSTEM & DEV',
      items: [
        { name: 'API Tester', path: '/dashboard/api-tester', icon: Terminal },
        { name: 'System Error Logs', path: '/dashboard/error-logs', icon: AlertTriangle },
        { name: 'Notifications', path: '/dashboard/notifications', icon: Bell, badge: '3' },
        { name: 'Settings', path: '/dashboard/settings', icon: Settings },
        { name: 'User Profile', path: '/dashboard/profile', icon: User },
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
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex flex-col h-screen bg-white border-r border-[#E5E7EB] z-30 select-none flex-shrink-0"
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-[#E5E7EB]">
        <NavLink to="/dashboard" className="flex items-center space-x-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-[#8E9A7D] flex items-center justify-center text-white flex-shrink-0 shadow-sm">
            <Shield className="w-5 h-5 stroke-[1.75]" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[#2B2B2B] tracking-tight">TrustGraph</span>
              <span className="text-[10px] text-[#6B7280] font-medium uppercase tracking-wider">Enterprise Security</span>
            </div>
          )}
        </NavLink>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg bg-[#F8F7F4] hover:bg-[#F3F2EF] text-[#6B7280] transition-colors"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4 stroke-[1.5]" /> : <ChevronLeft className="w-4 h-4 stroke-[1.5]" />}
        </button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!isCollapsed && (
              <h3 className="px-3 text-[10px] font-semibold text-[#9CA3AF] tracking-wider uppercase">
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
                    `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#8E9A7D] text-white shadow-sm font-semibold'
                        : 'text-[#6B7280] hover:text-[#2B2B2B] hover:bg-[#F3F2EF]'
                    }`
                  }
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 stroke-[1.75] flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                    {!isCollapsed && <span>{item.name}</span>}
                  </div>
                  {!isCollapsed && item.badge && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#D96C6C]/15 text-[#D96C6C]">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      {/* Public SaaS Site Link */}
      <div className="px-3 py-2 border-t border-[#E5E7EB]">
        <NavLink
          to="/"
          className="flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium text-[#6B7280] hover:text-[#2B2B2B] hover:bg-[#F3F2EF] transition-colors"
        >
          <Home className="w-4 h-4 stroke-[1.5] flex-shrink-0" />
          {!isCollapsed && <span>Public SaaS Website</span>}
        </NavLink>
      </div>

      {/* User Session Footer */}
      <div className="p-3 border-t border-[#E5E7EB] bg-[#F8F7F4]/60">
        {!isCollapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-[#8E9A7D]/20 text-[#7F8F73] border border-[#8E9A7D]/30 flex items-center justify-center font-bold text-xs">
                {user?.name?.[0] || 'A'}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-[#2B2B2B] truncate">{user?.name || 'Analyst Session'}</span>
                <span className="text-[10px] text-[#6B7280] truncate capitalize">{user?.role || 'Enterprise User'}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-[#9CA3AF] hover:text-[#D96C6C] rounded-lg hover:bg-[#F3F2EF] transition-colors"
              title="Logout Session"
            >
              <LogOut className="w-4 h-4 stroke-[1.5]" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full py-2 flex items-center justify-center text-[#9CA3AF] hover:text-[#D96C6C] transition-colors"
            title="Logout Session"
          >
            <LogOut className="w-4 h-4 stroke-[1.5]" />
          </button>
        )}
      </div>
    </motion.aside>
  );
}
