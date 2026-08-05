import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import LandingNavbar from '../components/LandingNavbar';
import LandingFooter from '../components/LandingFooter';
import { motion } from 'framer-motion';
import { Shield, FileText, Image as ImageIcon, Globe, Type, Award, ArrowRight, CheckCircle, Lock, ChevronDown } from 'lucide-react';

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState(0);

  const features = [
    {
      title: 'Document Verification',
      desc: 'Detect unencrypted PII leaks, API key exposures, and metadata forgery across PDF, DOCX, and TXT files.',
      icon: FileText,
    },
    {
      title: 'Image Forensics & ELA',
      desc: 'Analyze Error Level Analysis (ELA) pixel variance, Photoshop alteration traces, and synthetic AI image probability.',
      icon: ImageIcon,
    },
    {
      title: 'Website Trust Analysis',
      desc: 'Inspect TLS socket certificate chains, WHOIS registration age, open ports, and threat blacklists.',
      icon: Globe,
    },
    {
      title: 'AI Text Detection',
      desc: 'Identify LLM token signatures via Perplexity and Burstiness variance, VADER sentiment, and clickbait sensationalism.',
      icon: Type,
    },
    {
      title: 'Multi-Modal Trust Engine',
      desc: 'Synthesize heterogeneous vector scores into a single weighted Trust Index with statistical confidence scoring.',
      icon: Award,
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
    <div className="bg-[#F8F7F4] min-h-screen text-[#2B2B2B] font-sans selection:bg-[#8E9A7D] selection:text-white">
      <LandingNavbar />

      {/* Hero Section */}
      <section className="relative pt-36 pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white border border-[#E5E7EB] text-[#7F8F73] text-xs font-semibold shadow-xs"
          >
            <Shield className="w-4 h-4 stroke-[1.75]" />
            <span>Next-Gen Enterprise Digital Trust Platform</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-[#2B2B2B] tracking-tight max-w-4xl mx-auto leading-tight"
          >
            Verify Digital Trust with <span className="text-[#7F8F73]">AI Intelligence</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base sm:text-lg text-[#6B7280] max-w-2xl mx-auto"
          >
            TrustGraph analyzes documents, images, websites, and text streams to detect AI manipulation, PII leaks, EXIF tampering, and domain security risks in seconds.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <NavLink
              to="/signup"
              className="w-full sm:w-auto px-8 py-4 bg-[#8E9A7D] hover:bg-[#7F8F73] text-white font-semibold rounded-2xl text-xs transition-all shadow-xs flex items-center justify-center space-x-2 group"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4 stroke-[2] group-hover:translate-x-1 transition-transform" />
            </NavLink>
            <NavLink
              to="/login"
              className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-[#F3F2EF] text-[#2B2B2B] font-semibold rounded-2xl text-xs transition-colors border border-[#E5E7EB] flex items-center justify-center space-x-2 shadow-xs"
            >
              <Lock className="w-4 h-4 text-[#7F8F73]" />
              <span>Launch Enterprise Demo</span>
            </NavLink>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="pt-12 max-w-5xl mx-auto"
          >
            <div className="p-4 rounded-3xl bg-white border border-[#E5E7EB] shadow-xs">
              <div className="p-6 sm:p-8 rounded-2xl bg-[#F8F7F4] border border-[#E5E7EB] text-left space-y-6">
                <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-[#D96C6C]" />
                    <div className="w-3 h-3 rounded-full bg-[#D9A441]" />
                    <div className="w-3 h-3 rounded-full bg-[#5B8C5A]" />
                    <span className="text-xs font-mono text-[#9CA3AF] pl-2">trustgraph.ai/scan-eval</span>
                  </div>
                  <span className="text-xs font-mono text-[#5B8C5A] font-semibold">● LIVE RADAR</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-white rounded-xl border border-[#E5E7EB] space-y-1">
                    <span className="text-[#9CA3AF] text-[11px]">DOCUMENT PII LEAKS</span>
                    <p className="text-[#5B8C5A] font-bold text-base">0 Critical Leaks</p>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-[#E5E7EB] space-y-1">
                    <span className="text-[#9CA3AF] text-[11px]">IMAGE ELA VARIANCES</span>
                    <p className="text-[#5B8C5A] font-bold text-base">Authentic EXIF</p>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-[#E5E7EB] space-y-1">
                    <span className="text-[#9CA3AF] text-[11px]">COMPOSITE TRUST INDEX</span>
                    <p className="text-[#7F8F73] font-black text-lg">94.8 / 100</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Customer Logos */}
      <section className="py-12 border-y border-[#E5E7EB] bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-6">
          <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest">
            Trusted by Cybersecurity Analysts & Enterprises Worldwide
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-16 opacity-60 font-black text-[#6B7280] text-base">
            <span>MICROSOFT</span>
            <span>CROWDSTRIKE</span>
            <span>PALO ALTO</span>
            <span>DARKTRACE</span>
            <span>CLOUDFLARE</span>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-6 space-y-16">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h2 className="text-3xl font-extrabold text-[#2B2B2B] tracking-tight">
            Multi-Modal Digital Trust Analysis
          </h2>
          <p className="text-xs text-[#6B7280]">
            Engineered to evaluate authenticity across five specialized forensic domains.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="p-8 rounded-3xl bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] transition-all space-y-4 shadow-xs hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#8E9A7D]/15 text-[#7F8F73] flex items-center justify-center text-xl">
                  <Icon className="w-6 h-6 stroke-[1.75]" />
                </div>
                <h3 className="text-base font-bold text-[#2B2B2B]">
                  {f.title}
                </h3>
                <p className="text-xs text-[#6B7280] leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-white border-y border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-[#2B2B2B]">How TrustGraph Works</h2>
            <p className="text-xs text-[#6B7280]">3 simple steps to complete threat assessment</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.num} className="p-8 bg-[#F8F7F4] border border-[#E5E7EB] rounded-3xl space-y-4">
                <span className="text-3xl font-black text-[#8E9A7D] font-mono">{s.num}</span>
                <h3 className="text-base font-bold text-[#2B2B2B]">{s.title}</h3>
                <p className="text-xs text-[#6B7280] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section id="stats" className="py-20 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 p-12 bg-white rounded-3xl border border-[#E5E7EB] text-center shadow-xs">
          {stats.map((st) => (
            <div key={st.label} className="space-y-2">
              <h3 className="text-4xl font-black text-[#2B2B2B] tracking-tight">{st.value}</h3>
              <p className="text-xs text-[#7F8F73] font-semibold">{st.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 max-w-4xl mx-auto px-6 space-y-8">
        <h2 className="text-3xl font-bold text-[#2B2B2B] text-center">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
              className="p-6 bg-white border border-[#E5E7EB] rounded-2xl cursor-pointer space-y-2 shadow-xs"
            >
              <div className="flex justify-between items-center font-semibold text-xs text-[#2B2B2B]">
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${openFaq === idx ? 'rotate-180 text-[#7F8F73]' : 'text-[#9CA3AF]'}`} />
              </div>
              {openFaq === idx && (
                <p className="text-xs text-[#6B7280] pt-2 border-t border-[#E5E7EB] leading-relaxed">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
