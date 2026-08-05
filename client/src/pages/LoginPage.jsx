import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useErrorLogs } from '../context/ErrorLogContext';
import { FaShieldAlt, FaLock, FaEnvelope, FaGoogle, FaArrowRight } from 'react-icons/fa';

export default function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useErrorLogs();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: 'sarah@cyberdyne.org',
    password: 'Password123!',
    rememberMe: true,
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.post('/auth/login', {
        email: form.email,
        password: form.password,
      });

      if (res.data?.success) {
        login(res.data.data.token, res.data.data.user);
        showToast('Login successful! Welcome to TrustGraph.', 'success');
        navigate('/dashboard');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1220] flex text-slate-100 font-sans">
      {/* Left Column: Branding & Marketing Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-950 p-16 flex-col justify-between border-r border-slate-800/80 relative overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />

        <NavLink to="/" className="flex items-center space-x-3 group relative z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
            <FaShieldAlt className="text-xl" />
          </div>
          <span className="text-2xl font-black text-white tracking-wide">
            Trust<span className="text-blue-500">Graph</span>
          </span>
        </NavLink>

        <div className="space-y-6 relative z-10 max-w-lg">
          <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold rounded-full">
            Enterprise Security Portal
          </span>
          <h1 className="text-4xl font-extrabold text-white leading-tight">
            Automated Digital Trust & Authenticity Verification
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Access forensic evaluations for documents, images, domains, and AI-generated content protected by zero-trust encryption.
          </p>
        </div>

        <div className="text-xs text-slate-600 relative z-10">
          © 2026 TrustGraph AI Inc. Secure TLS 1.3 Encryption.
        </div>
      </div>

      {/* Right Column: Glassmorphic Login Form */}
      <div className="w-full lg:w-1/2 p-8 sm:p-16 flex items-center justify-center relative">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">Sign In to Platform</h2>
            <p className="text-xs text-slate-400 mt-2">Enter your corporate credentials to access the analyst dashboard.</p>
          </div>

          {errorMsg && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-slate-400">Email Address</label>
              <div className="relative mt-1.5">
                <FaEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="analyst@enterprise.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Password</label>
              <div className="relative mt-1.5">
                <FaLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center space-x-2 text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.rememberMe}
                  onChange={(e) => setForm({ ...form, rememberMe: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0"
                />
                <span>Remember me</span>
              </label>
              <a href="#forgot" className="text-blue-400 hover:underline font-semibold">Forgot Password?</a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
              <FaArrowRight />
            </button>
          </form>

          <div className="relative flex items-center justify-center text-xs text-slate-500 my-4">
            <span className="bg-[#0B1220] px-3 relative z-10">OR CONTINUE WITH</span>
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
          </div>

          <button
            type="button"
            onClick={() => showToast('Google SSO integration enabled for Enterprise domains.', 'info')}
            className="w-full py-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center space-x-2"
          >
            <FaGoogle className="text-rose-400" />
            <span>Sign In with Single Sign-On (SSO)</span>
          </button>

          <p className="text-xs text-center text-slate-400">
            Don't have an account?{' '}
            <NavLink to="/signup" className="text-blue-400 font-bold hover:underline">
              Create an Account
            </NavLink>
          </p>
        </div>
      </div>
    </div>
  );
}
