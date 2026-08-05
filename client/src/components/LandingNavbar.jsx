import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaShieldAlt, FaArrowRight, FaBars, FaTimes } from 'react-icons/fa';

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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0B1220]/90 backdrop-blur-md border-b border-slate-800/80 py-3 shadow-2xl'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Brand Logo */}
        <NavLink to="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 group-hover:scale-105 transition-transform">
            <FaShieldAlt className="text-xl" />
          </div>
          <span className="text-xl font-black text-white tracking-wide">
            Trust<span className="text-blue-500">Graph</span>
          </span>
        </NavLink>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
          <a href="#stats" className="hover:text-white transition-colors">Security Metrics</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
        </nav>

        {/* CTA Action Buttons */}
        <div className="hidden md:flex items-center space-x-4">
          {token ? (
            <NavLink
              to="/dashboard"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-600/25 flex items-center space-x-2"
            >
              <span>Go to Dashboard</span>
              <FaArrowRight />
            </NavLink>
          ) : (
            <>
              <NavLink
                to="/login"
                className="text-xs font-semibold text-slate-300 hover:text-white transition-colors px-3 py-2"
              >
                Sign In
              </NavLink>
              <NavLink
                to="/signup"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-600/25 flex items-center space-x-2"
              >
                <span>Get Started</span>
                <FaArrowRight />
              </NavLink>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-slate-400 hover:text-white text-xl focus:outline-none"
        >
          {mobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 p-6 space-y-4 text-sm font-medium">
          <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-slate-300 hover:text-white">Features</a>
          <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block text-slate-300 hover:text-white">How It Works</a>
          <a href="#stats" onClick={() => setMobileMenuOpen(false)} className="block text-slate-300 hover:text-white">Security Metrics</a>
          <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block text-slate-300 hover:text-white">FAQ</a>
          <div className="pt-4 border-t border-slate-800 flex flex-col space-y-2">
            <NavLink to="/login" onClick={() => setMobileMenuOpen(false)} className="py-2 text-center text-slate-300">Sign In</NavLink>
            <NavLink to="/signup" onClick={() => setMobileMenuOpen(false)} className="py-2.5 bg-blue-600 text-center text-white font-bold rounded-xl">Get Started</NavLink>
          </div>
        </div>
      )}
    </header>
  );
}
