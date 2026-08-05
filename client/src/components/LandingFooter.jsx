import React from 'react';
import { NavLink } from 'react-router-dom';
import { Shield } from 'lucide-react';

export default function LandingFooter() {
  return (
    <footer className="bg-white border-t border-[#E5E7EB] text-[#6B7280] py-12 text-xs">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-[#8E9A7D] flex items-center justify-center text-white">
              <Shield className="w-4 h-4 stroke-[1.75]" />
            </div>
            <span className="text-lg font-bold text-[#2B2B2B] tracking-tight">TrustGraph</span>
          </div>
          <p className="text-[#6B7280] leading-relaxed">
            AI-powered digital trust and authenticity platform for enterprise risk evaluation, document forensics, and domain security verification.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="text-[#2B2B2B] font-bold uppercase tracking-wider text-[11px]">Product Platform</h4>
          <ul className="space-y-2">
            <li><NavLink to="/login" className="hover:text-[#2B2B2B] transition-colors">Document Analyzer</NavLink></li>
            <li><NavLink to="/login" className="hover:text-[#2B2B2B] transition-colors">Image Forensics & ELA</NavLink></li>
            <li><NavLink to="/login" className="hover:text-[#2B2B2B] transition-colors">Website Security Inspector</NavLink></li>
            <li><NavLink to="/login" className="hover:text-[#2B2B2B] transition-colors">Text AI Detector</NavLink></li>
          </ul>
        </div>

        <div className="space-y-3">
          <h4 className="text-[#2B2B2B] font-bold uppercase tracking-wider text-[11px]">Enterprise Security</h4>
          <ul className="space-y-2">
            <li><a href="#stats" className="hover:text-[#2B2B2B] transition-colors">SOC2 Type II Certified</a></li>
            <li><a href="#stats" className="hover:text-[#2B2B2B] transition-colors">GDPR & ISO 27001</a></li>
            <li><a href="#stats" className="hover:text-[#2B2B2B] transition-colors">API SLA Guarantees</a></li>
          </ul>
        </div>

        <div className="space-y-3">
          <h4 className="text-[#2B2B2B] font-bold uppercase tracking-wider text-[11px]">Connect</h4>
          <p className="text-[#6B7280]">Enterprise support, SOC2 compliance & security inquiries.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-8 mt-8 border-t border-[#E5E7EB] text-center text-[#9CA3AF]">
        <p>© 2026 TrustGraph AI Inc. Natural Neutral Design System Architecture.</p>
      </div>
    </footer>
  );
}
