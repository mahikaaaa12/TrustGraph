import React from 'react';
import { FaBell, FaExclamationTriangle, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';

export default function NotificationsPage() {
  const notifications = [
    {
      id: 1,
      title: 'Critical Threat Alert: Sensitive PII Exposure',
      message: 'Document analyzer flagged 4 leaked AWS API Secret Keys in contract_v2.pdf.',
      time: '10 mins ago',
      type: 'critical',
    },
    {
      id: 2,
      title: 'SSL Certificate Validated',
      message: 'Website security scan on google.com returned 98% Trust Score.',
      time: '1 hour ago',
      type: 'success',
    },
    {
      id: 3,
      title: 'System Maintenance Complete',
      message: 'MongoDB Atlas cluster index optimization finished cleanly.',
      time: '3 hours ago',
      type: 'info',
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Security Notifications & System Alerts</h1>
        <p className="text-sm text-slate-400 mt-1">
          Operational alert feed capturing real-time security triggers, threat warnings, and cluster status updates.
        </p>
      </div>

      <div className="space-y-4">
        {notifications.map((n) => (
          <div
            key={n.id}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex items-start space-x-4"
          >
            <div
              className={`p-3 rounded-xl ${
                n.type === 'critical'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : n.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              }`}
            >
              {n.type === 'critical' ? (
                <FaExclamationTriangle className="text-lg" />
              ) : n.type === 'success' ? (
                <FaCheckCircle className="text-lg" />
              ) : (
                <FaInfoCircle className="text-lg" />
              )}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-white">{n.title}</h3>
                <span className="text-[11px] text-slate-500 font-mono">{n.time}</span>
              </div>
              <p className="text-xs text-slate-400">{n.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
