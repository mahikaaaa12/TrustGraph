import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useErrorLogs } from '../context/ErrorLogContext';
import { Shield, Lock, Mail, ArrowRight } from 'lucide-react';

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
    <div className="min-h-screen bg-[#F8F7F4] flex text-[#2B2B2B] font-sans">
      {/* Left Column: Soft Linen Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#F3F2EF] p-16 flex-col justify-between border-r border-[#E5E7EB] relative overflow-hidden">
        <NavLink to="/" className="flex items-center space-x-3 group relative z-10">
          <div className="w-9 h-9 rounded-xl bg-[#8E9A7D] flex items-center justify-center text-white shadow-xs">
            <Shield className="w-5 h-5 stroke-[1.75]" />
          </div>
          <span className="text-xl font-bold text-[#2B2B2B] tracking-tight">
            Trust<span className="text-[#8E9A7D]">Graph</span>
          </span>
        </NavLink>

        <div className="space-y-6 relative z-10 max-w-lg">
          <span className="px-3 py-1 bg-white text-[#7F8F73] border border-[#E5E7EB] text-xs font-semibold rounded-full shadow-xs">
            Enterprise Security Portal
          </span>
          <h1 className="text-4xl font-extrabold text-[#2B2B2B] leading-tight">
            Automated Digital Trust & Authenticity Verification
          </h1>
          <p className="text-xs text-[#6B7280] leading-relaxed">
            Access forensic evaluations for documents, images, domains, and AI-generated content protected by zero-trust encryption.
          </p>
        </div>

        <div className="text-xs text-[#9CA3AF] relative z-10">
          © 2026 TrustGraph AI Inc. Secure TLS 1.3 Encryption.
        </div>
      </div>

      {/* Right Column: Glass / Natural Card Form */}
      <div className="w-full lg:w-1/2 p-8 sm:p-16 flex items-center justify-center relative">
        <div className="w-full max-w-md space-y-8 bg-white p-8 sm:p-10 rounded-3xl border border-[#E5E7EB] shadow-xs">
          <div>
            <h2 className="text-2xl font-bold text-[#2B2B2B] tracking-tight">Sign In to Platform</h2>
            <p className="text-xs text-[#6B7280] mt-1.5">Enter your corporate credentials to access the analyst dashboard.</p>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-[#D96C6C]/10 border border-[#D96C6C]/30 rounded-xl text-xs text-[#D96C6C]">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#6B7280]">Email Address</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] w-4 h-4 stroke-[1.5]" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="analyst@enterprise.com"
                  className="w-full pl-10 pr-4 py-3 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl text-xs text-[#2B2B2B] focus:outline-none focus:border-[#8E9A7D]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#6B7280]">Password</label>
              <div className="relative mt-1">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] w-4 h-4 stroke-[1.5]" />
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl text-xs text-[#2B2B2B] focus:outline-none focus:border-[#8E9A7D]"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center space-x-2 text-[#6B7280] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.rememberMe}
                  onChange={(e) => setForm({ ...form, rememberMe: e.target.checked })}
                  className="rounded bg-[#F8F7F4] border-[#E5E7EB] text-[#8E9A7D] focus:ring-0"
                />
                <span>Remember me</span>
              </label>
              <a href="#forgot" className="text-[#7F8F73] hover:underline font-semibold">Forgot Password?</a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#8E9A7D] hover:bg-[#7F8F73] disabled:bg-[#E5E7EB] text-white font-semibold rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center space-x-2"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2]" />
            </button>
          </form>

          <p className="text-xs text-center text-[#6B7280] pt-2 border-t border-[#E5E7EB]">
            Don't have an account?{' '}
            <NavLink to="/signup" className="text-[#7F8F73] font-bold hover:underline">
              Create an Account
            </NavLink>
          </p>
        </div>
      </div>
    </div>
  );
}
