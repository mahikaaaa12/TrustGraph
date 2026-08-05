import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaShieldAlt, FaGithub, FaTwitter, FaLinkedin } from 'react-icons/fa';

export default function LandingFooter() {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 py-12 text-xs">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand Column */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <FaShieldAlt className="text-base" />
            </div>
            <span className="text-lg font-black text-white tracking-wide">TrustGraph</span>
          </div>
          <p className="text-slate-500 leading-relaxed">
            AI-powered digital trust and authenticity platform for enterprise risk evaluation, document forensics, and domain security verification.
          </p>
        </div>

        {/* Product Links */}
        <div className="space-y-3">
          <h4 className="text-white font-bold uppercase tracking-wider text-[11px]">Product Platform</h4>
          <ul className="space-y-2">
            <li><NavLink to="/login" className="hover:text-white transition-colors">Document Analyzer</NavLink></li>
            <li><NavLink to="/login" className="hover:text-white transition-colors">Image Forensics & ELA</NavLink></li>
            <li><NavLink to="/login" className="hover:text-white transition-colors">Website Security Inspector</NavLink></li>
            <li><NavLink to="/login" className="hover:text-white transition-colors">Text AI Detector</NavLink></li>
          </ul>
        </div>

        {/* Security & Compliance */}
        <div className="space-y-3">
          <h4 className="text-white font-bold uppercase tracking-wider text-[11px]">Enterprise Security</h4>
          <ul className="space-y-2">
            <li><a href="#stats" className="hover:text-white transition-colors">SOC2 Type II Certified</a></li>
            <li><a href="#stats" className="hover:text-white transition-colors">GDPR & ISO 27001</a></li>
            <li><a href="#stats" className="hover:text-white transition-colors">API SLA Guarantees</a></li>
          </ul>
        </div>

        {/* Connect & Social */}
        <div className="space-y-3">
          <h4 className="text-white font-bold uppercase tracking-wider text-[11px]">Connect</h4>
          <div className="flex space-x-3 text-lg">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="p-2 bg-slate-900 rounded-lg hover:text-white border border-slate-800"><FaGithub /></a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="p-2 bg-slate-900 rounded-lg hover:text-white border border-slate-800"><FaTwitter /></a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="p-2 bg-slate-900 rounded-lg hover:text-white border border-slate-800"><FaLinkedin /></a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-8 mt-8 border-t border-slate-900 text-center text-slate-600">
        <p>© 2026 TrustGraph AI Inc. All rights reserved. Built with React 19 & Express.</p>
      </div>
    </footer>
  );
}
