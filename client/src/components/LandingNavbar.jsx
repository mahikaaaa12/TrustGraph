import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, ArrowRight, Menu, X } from 'lucide-react';

export default function LandingNavbar() {
  const { token } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-md border-b border-[#E5E7EB] py-3.5 shadow-xs'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <NavLink to="/" className="flex items-center space-x-3 group">
          <div className="w-9 h-9 rounded-xl bg-[#8E9A7D] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
            <Shield className="w-5 h-5 stroke-[1.75]" />
          </div>
          <span className="text-xl font-bold text-[#2B2B2B] tracking-tight">
            Trust<span className="text-[#8E9A7D]">Graph</span>
          </span>
        </NavLink>

        <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold text-[#6B7280]">
          <a href="#features" className="hover:text-[#2B2B2B] transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-[#2B2B2B] transition-colors">How It Works</a>
          <a href="#stats" className="hover:text-[#2B2B2B] transition-colors">Security Metrics</a>
          <a href="#faq" className="hover:text-[#2B2B2B] transition-colors">FAQ</a>
        </nav>

        <div className="hidden md:flex items-center space-x-4">
          {token ? (
            <NavLink
              to="/dashboard"
              className="px-5 py-2.5 bg-[#8E9A7D] hover:bg-[#7F8F73] text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center space-x-2"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2]" />
            </NavLink>
          ) : (
            <>
              <NavLink
                to="/login"
                className="text-xs font-semibold text-[#6B7280] hover:text-[#2B2B2B] transition-colors px-3 py-2"
              >
                Sign In
              </NavLink>
              <NavLink
                to="/signup"
                className="px-5 py-2.5 bg-[#8E9A7D] hover:bg-[#7F8F73] text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center space-x-2"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2]" />
              </NavLink>
            </>
          )}
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-[#6B7280] hover:text-[#2B2B2B] focus:outline-none"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-[#E5E7EB] p-6 space-y-4 text-xs font-semibold text-[#6B7280]">
          <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block hover:text-[#2B2B2B]">Features</a>
          <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block hover:text-[#2B2B2B]">How It Works</a>
          <a href="#stats" onClick={() => setMobileMenuOpen(false)} className="block hover:text-[#2B2B2B]">Security Metrics</a>
          <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block hover:text-[#2B2B2B]">FAQ</a>
          <div className="pt-4 border-t border-[#E5E7EB] flex flex-col space-y-2">
            <NavLink to="/login" onClick={() => setMobileMenuOpen(false)} className="py-2 text-center">Sign In</NavLink>
            <NavLink to="/signup" onClick={() => setMobileMenuOpen(false)} className="py-2.5 bg-[#8E9A7D] text-center text-white font-bold rounded-xl">Get Started</NavLink>
          </div>
        </div>
      )}
    </header>
  );
}
