import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import LandingNavbar from '../components/LandingNavbar';
import LandingFooter from '../components/LandingFooter';
import { motion } from 'framer-motion';
import {
  FaShieldAlt,
  FaFileAlt,
  FaImage,
  FaGlobe,
  FaFont,
  FaArrowRight,
  FaCheckCircle,
  FaLock,
  FaChartLine,
  FaQuestionCircle,
  FaChevronDown,
} from 'react-icons/fa';

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState(0);

  const features = [
    {
      title: 'Document Verification',
      desc: 'Detect unencrypted PII leaks, API key exposures, and metadata forgery across PDF, DOCX, and TXT files.',
      icon: FaFileAlt,
      color: 'from-blue-600 to-indigo-600',
    },
    {
      title: 'Image Forensics & ELA',
      desc: 'Analyze Error Level Analysis (ELA) pixel variance, Photoshop alteration traces, and synthetic AI image probability.',
      icon: FaImage,
      color: 'from-indigo-600 to-purple-600',
    },
    {
      title: 'Website Trust Analysis',
      desc: 'Inspect TLS socket certificate chains, WHOIS registration age, open ports, and threat blacklists.',
      icon: FaGlobe,
      color: 'from-emerald-600 to-teal-600',
    },
    {
      title: 'AI Text Detection',
      desc: 'Identify LLM token signatures via Perplexity and Burstiness variance, VADER sentiment, and clickbait sensationalism.',
      icon: FaFont,
      color: 'from-amber-600 to-orange-600',
    },
    {
      title: 'Multi-Modal Trust Engine',
      desc: 'Synthesize heterogeneous vector scores into a single weighted Trust Index with statistical confidence scoring.',
      icon: FaShieldAlt,
      color: 'from-rose-600 to-red-600',
    },
  ];

  const steps = [
    { num: '01', title: 'Upload Artifact', desc: 'Drag and drop any PDF, image file, domain URL, or raw text passage.' },
    { num: '02', title: 'AI Neural Evaluation', desc: 'Our multi-modal engine executes forensic checks, ELA, PII regex, and NLP perplexity scans.' },
    { num: '03', title: 'Trust Score & Report', desc: 'Receive a composite Trust Score (0-100), risk categorization, and printable PDF compliance reports.' },
  ];

  const stats = [
    { value: '99.9%', label: 'AI Detection Accuracy' },
    { value: '1M+', label: 'Artifacts Evaluated' },
    { value: '1.2s', label: 'Average Response Time' },
    { value: '0', label: 'False Positives in Production' },
  ];

  const faqs = [
    {
      q: 'How does TrustGraph calculate the composite Trust Score?',
      a: 'TrustGraph uses a weighted synthesis algorithm: Authenticity Index (35%), Security & Encryption (25%), Metadata Provenance (20%), and Source Reputation (20%).',
    },
    {
      q: 'What file formats are supported for document and image analysis?',
      a: 'Document Analyzer supports PDF, DOCX, and TXT files up to 10MB. Image Forensics supports PNG, JPEG, and WebP images.',
    },
    {
      q: 'Is my data stored securely?',
      a: 'Yes. All uploads are hashed using SHA-256 for deduplication and stored with enterprise encryption at rest.',
    },
  ];

  return (
    <div className="bg-[#0B1220] min-h-screen text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Navigation Header */}
      <LandingNavbar />

      {/* Hero Section */}
      <section className="relative pt-36 pb-24 overflow-hidden">
        {/* Background Radial Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold"
          >
            <FaShieldAlt className="text-sm" />
            <span>Next-Gen Enterprise Digital Trust Platform</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight max-w-4xl mx-auto leading-tight"
          >
            Verify Digital Trust with <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-indigo-400 to-teal-400">AI Intelligence</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto"
          >
            TrustGraph analyzes documents, images, websites, and text streams to detect AI manipulation, PII leaks, EXIF tampering, and domain security risks in seconds.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <NavLink
              to="/signup"
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl text-sm transition-all shadow-xl shadow-blue-600/30 flex items-center justify-center space-x-2 group"
            >
              <span>Get Started Free</span>
              <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
            </NavLink>
            <NavLink
              to="/login"
              className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold rounded-2xl text-sm transition-colors border border-slate-800 flex items-center justify-center space-x-2"
            >
              <FaLock className="text-xs text-blue-400" />
              <span>Launch Enterprise Demo</span>
            </NavLink>
          </motion.div>

          {/* Hero UI Graphic Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="pt-12 max-w-5xl mx-auto"
          >
            <div className="p-3 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-xl">
              <div className="p-6 sm:p-8 rounded-2xl bg-[#0B1220] border border-slate-800/80 text-left space-y-6">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-xs font-mono text-slate-500 pl-2">trustgraph.ai/scan-eval</span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-semibold">● LIVE RADAR</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-500 text-[11px]">DOCUMENT PII LEAKS</span>
                    <p className="text-rose-400 font-bold text-lg">0 Critical Leaks</p>
                  </div>
                  <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-500 text-[11px]">IMAGE ELA VARIANCES</span>
                    <p className="text-emerald-400 font-bold text-lg">Authentic EXIF</p>
                  </div>
                  <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-500 text-[11px]">COMPOSITE TRUST INDEX</span>
                    <p className="text-blue-400 font-black text-xl">94.8 / 100</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trusted By Companies Ticker */}
      <section className="py-12 border-y border-slate-800/60 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Trusted by Cybersecurity Analysts & Enterprises Worldwide
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-16 opacity-50 font-black text-slate-400 text-lg">
            <span>MICROSOFT</span>
            <span>CROWDSTRIKE</span>
            <span>PALO ALTO</span>
            <span>DARKTRACE</span>
            <span>CLOUDFLARE</span>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-6 space-y-16">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Multi-Modal Digital Trust Analysis
          </h2>
          <p className="text-sm text-slate-400">
            Engineered to evaluate authenticity across five specialized forensic domains.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all space-y-4 group hover:-translate-y-1"
              >
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white text-xl shadow-lg`}
                >
                  <Icon />
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                  {f.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-slate-950/60 border-y border-slate-800/60">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white">How TrustGraph Works</h2>
            <p className="text-sm text-slate-400">3 simple steps to complete threat assessment</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.num} className="p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
                <span className="text-3xl font-black text-blue-500 font-mono">{s.num}</span>
                <h3 className="text-lg font-bold text-white">{s.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section id="stats" className="py-20 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 p-12 bg-gradient-to-br from-blue-900/30 to-slate-900 rounded-3xl border border-blue-500/20 text-center">
          {stats.map((st) => (
            <div key={st.label} className="space-y-2">
              <h3 className="text-4xl font-black text-white tracking-tight">{st.value}</h3>
              <p className="text-xs text-blue-300 font-semibold">{st.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Accordion */}
      <section id="faq" className="py-20 max-w-4xl mx-auto px-6 space-y-8">
        <h2 className="text-3xl font-bold text-white text-center">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
              className="p-6 bg-slate-900 border border-slate-800 rounded-2xl cursor-pointer space-y-2"
            >
              <div className="flex justify-between items-center font-semibold text-sm text-white">
                <span>{faq.q}</span>
                <FaChevronDown className={`transition-transform ${openFaq === idx ? 'rotate-180 text-blue-400' : 'text-slate-500'}`} />
              </div>
              {openFaq === idx && (
                <p className="text-xs text-slate-400 pt-2 border-t border-slate-800/60 leading-relaxed">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Public Footer */}
      <LandingFooter />
    </div>
  );
}
