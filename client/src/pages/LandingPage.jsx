import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import LandingNavbar from '../components/LandingNavbar';
import LandingFooter from '../components/LandingFooter';
import { motion } from 'framer-motion';
import { Shield, FileText, Image as ImageIcon, Globe, Type, Award, ArrowRight, CheckCircle, Lock, ChevronDown, Check, Sparkles, Share2 } from 'lucide-react';

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState(0);

  const creatorChecklist = [
    'Verify images',
    'Check captions',
    'Inspect external links',
    'Detect suspicious content',
    'Generate verification reports',
    'Review collaboration requests',
  ];

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
      title: 'AI Text & Caption Authenticity',
      desc: 'Identify LLM token signatures via Perplexity and Burstiness variance, VADER sentiment, and clickbait sensationalism.',
      icon: Type,
    },
    {
      title: 'Multi-Modal Trust Engine',
      desc: 'Synthesize heterogeneous vector scores into a single weighted Trust Index with statistical confidence scoring.',
      icon: Award,
    },
    {
      title: 'Graph Abuse Detection',
      desc: 'Identify coordinated scam syndicates, suspicious referral rings, and cross-platform threat clusters.',
      icon: Shield,
    },
  ];

  const steps = [
    { num: '01', title: 'Upload Content or Link', desc: 'Provide images, text captions, domain URLs, or supporting documents for pre-publish inspection.' },
    { num: '02', title: 'Multi-Modal Engine Evaluation', desc: 'Our multi-modal engine executes forensic image checks, ELA, PII regex, website security, and NLP perplexity scans.' },
    { num: '03', title: 'Trust Score & Verification Report', desc: 'Receive a composite Trust Score (0-100), detailed risk breakdown, and printable Verification Reports.' },
  ];

  const stats = [
    { value: '5', label: 'Forensic Modalities' },
    { value: '100%', label: 'Explainable Risk Attribution' },
    { value: 'Unified', label: 'Creator & Security Workflows' },
    { value: '0', label: 'Vendor Lock-in' },
  ];

  const faqs = [
    {
      q: 'How does TrustGraph calculate the composite Trust Score?',
      a: 'TrustGraph uses a weighted synthesis algorithm evaluating Authenticity Index (35%), Security & Encryption (25%), Metadata Provenance (20%), and Source Reputation (20%).',
    },
    {
      q: 'How does TrustGraph support content creators?',
      a: 'TrustGraph helps creators verify posts before publishing, analyze external links in captions for phishing, inspect brand collaboration proposals, and generate verified content reports.',
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
            <Sparkles className="w-4 h-4 stroke-[1.75]" />
            <span>Verify content before you publish it.</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-[#2B2B2B] tracking-tight max-w-4xl mx-auto leading-tight"
          >
            Trust the content. <span className="text-[#7F8F73]">Verify the source.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base sm:text-lg text-[#6B7280] max-w-3xl mx-auto leading-relaxed"
          >
            TrustGraph analyzes images, text, links and documents to help creators and teams identify authenticity, security and risk signals before they publish, share or act.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <NavLink
              to="/dashboard/post-verification"
              className="w-full sm:w-auto px-8 py-4 bg-[#8E9A7D] hover:bg-[#7F8F73] text-white font-semibold rounded-2xl text-xs transition-all shadow-xs flex items-center justify-center space-x-2 group"
            >
              <span>Verify Content</span>
              <ArrowRight className="w-4 h-4 stroke-[2] group-hover:translate-x-1 transition-transform" />
            </NavLink>
            <NavLink
              to="/dashboard"
              className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-[#F3F2EF] text-[#2B2B2B] font-semibold rounded-2xl text-xs transition-colors border border-[#E5E7EB] flex items-center justify-center space-x-2 shadow-xs"
            >
              <Shield className="w-4 h-4 text-[#7F8F73]" />
              <span>Explore Security Analysis</span>
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
                    <span className="text-xs font-mono text-[#9CA3AF] pl-2">trustgraph.ai/content-verification</span>
                  </div>
                  <span className="text-xs font-mono text-[#5B8C5A] font-semibold">● CREATOR SECURITY RADAR</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-white rounded-xl border border-[#E5E7EB] space-y-1">
                    <span className="text-[#9CA3AF] text-[11px]">IMAGE AUTHENTICITY</span>
                    <p className="text-[#5B8C5A] font-bold text-base">Verified Original</p>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-[#E5E7EB] space-y-1">
                    <span className="text-[#9CA3AF] text-[11px]">EXTERNAL LINK SAFETY</span>
                    <p className="text-[#5B8C5A] font-bold text-base">Clean SSL & Domain</p>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-[#E5E7EB] space-y-1">
                    <span className="text-[#9CA3AF] text-[11px]">CONTENT TRUST SCORE</span>
                    <p className="text-[#7F8F73] font-black text-lg">92 / 100</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Creator Workflow Section */}
      <section className="py-20 bg-white border-y border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-left">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#8E9A7D]/10 text-[#7F8F73] text-xs font-semibold">
              <Share2 className="w-3.5 h-3.5" />
              <span>For Content Creators & Media Teams</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#2B2B2B] tracking-tight">
              Built for the modern content workflow
            </h2>
            <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
              Verify your social media posts, analyze sponsor collaboration requests, and ensure every link and asset you publish maintains maximum security and audience trust.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {creatorChecklist.map((item) => (
                <div key={item} className="flex items-center space-x-3 p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB]">
                  <div className="w-6 h-6 rounded-full bg-[#5B8C5A]/15 text-[#5B8C5A] flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <span className="text-xs font-semibold text-[#2B2B2B]">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-8 bg-[#F8F7F4] rounded-3xl border border-[#E5E7EB] space-y-6">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
              <h3 className="text-sm font-bold text-[#2B2B2B]">Creator Pre-Publish Verification</h3>
              <span className="px-2.5 py-1 rounded-full bg-[#5B8C5A]/10 text-[#5B8C5A] text-[11px] font-bold">LOW RISK</span>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-[#E5E7EB]">
                <span className="text-[#6B7280]">Image Forensics & ELA</span>
                <span className="font-semibold text-[#5B8C5A]">Pass (96/100)</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-[#E5E7EB]">
                <span className="text-[#6B7280]">Caption AI / Clickbait Signals</span>
                <span className="font-semibold text-[#5B8C5A]">Natural (88/100)</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-[#E5E7EB]">
                <span className="text-[#6B7280]">External Sponsor Link</span>
                <span className="font-semibold text-[#5B8C5A]">Valid SSL & Reputation</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-[#E5E7EB]">
                <span className="text-[#6B7280]">Brand Contract Scan</span>
                <span className="font-semibold text-[#5B8C5A]">No Secret PII Leaks</span>
              </div>
            </div>
            <NavLink
              to="/dashboard/post-verification"
              className="w-full py-3 bg-[#8E9A7D] hover:bg-[#7F8F73] text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center space-x-2"
            >
              <span>Test Pre-Publish Verification</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </NavLink>
          </div>
        </div>
      </section>

      {/* Core Architectural Pillars */}
      <section className="py-12 border-b border-[#E5E7EB] bg-[#F8F7F4]">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-6">
          <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest">
            Multi-Modal Forensic Intelligence & Creator Trust Architecture
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 opacity-80 font-mono font-bold text-[#6B7280] text-xs">
            <span className="px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EB]">IMAGE ELA FORENSICS</span>
            <span className="px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EB]">DOCUMENT PII LEAKS</span>
            <span className="px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EB]">DOMAIN REPUTATION</span>
            <span className="px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EB]">TEXT PROVENANCE</span>
            <span className="px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EB]">GRAPH ABUSE RINGS</span>
            <span className="px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EB]">POST VERIFICATION</span>
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
            Engineered to evaluate authenticity and safety across specialized forensic and creator verification domains.
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
            <p className="text-xs text-[#6B7280]">3 simple steps to complete threat assessment and content verification</p>
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

