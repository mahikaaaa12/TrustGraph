import React from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

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
        <h1 className="text-2xl font-bold text-[#2B2B2B] tracking-tight">Security Notifications & System Alerts</h1>
        <p className="text-xs text-[#6B7280] mt-1">
          Operational alert feed capturing real-time security triggers, threat warnings, and cluster status updates.
        </p>
      </div>

      <div className="space-y-4">
        {notifications.map((n) => (
          <div
            key={n.id}
            className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs flex items-start space-x-4"
          >
            <div
              className={`p-2.5 rounded-xl ${
                n.type === 'critical'
                  ? 'bg-[#D96C6C]/15 text-[#D96C6C]'
                  : n.type === 'success'
                  ? 'bg-[#5B8C5A]/15 text-[#5B8C5A]'
                  : 'bg-[#7F8F73]/15 text-[#7F8F73]'
              }`}
            >
              {n.type === 'critical' ? (
                <AlertCircle className="w-5 h-5 stroke-[1.75]" />
              ) : n.type === 'success' ? (
                <CheckCircle className="w-5 h-5 stroke-[1.75]" />
              ) : (
                <Info className="w-5 h-5 stroke-[1.75]" />
              )}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-[#2B2B2B]">{n.title}</h3>
                <span className="text-[11px] text-[#9CA3AF] font-mono">{n.time}</span>
              </div>
              <p className="text-xs text-[#6B7280]">{n.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
