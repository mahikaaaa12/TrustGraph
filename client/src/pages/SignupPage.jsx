import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useErrorLogs } from '../context/ErrorLogContext';
import { Shield, User, Mail, Lock, ArrowRight, CheckCircle } from 'lucide-react';

export default function SignupPage() {
  const { login } = useAuth();
  const { showToast } = useErrorLogs();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'analyst',
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const getPasswordStrength = (pass) => {
    let score = 0;
    if (pass.length > 6) score += 25;
    if (pass.length > 10) score += 25;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[0-9!]/.test(pass)) score += 25;
    return score;
  };

  const strength = getPasswordStrength(form.password);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.post('/auth/signup', {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
      });

      if (res.data?.success) {
        login(res.data.data.token, res.data.data.user);
        showToast('Registration successful! Redirecting to dashboard...', 'success');
        navigate('/dashboard');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed. Email may already exist.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7F4] flex text-[#2B2B2B] font-sans">
      {/* Left Column */}
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
          <h1 className="text-4xl font-extrabold text-[#2B2B2B] leading-tight">
            Join Enterprise Security Teams Worldwide
          </h1>
          <div className="space-y-3 text-xs text-[#6B7280]">
            <div className="flex items-center space-x-3">
              <CheckCircle className="text-[#5B8C5A] w-4 h-4 stroke-[1.75]" />
              <span>Multi-modal AI evaluation across PDF, DOCX, and image files</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="text-[#5B8C5A] w-4 h-4 stroke-[1.75]" />
              <span>Real-time SSL certificate and WHOIS threat blacklists</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="text-[#5B8C5A] w-4 h-4 stroke-[1.75]" />
              <span>Executive compliance report exports with SOC2 metrics</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-[#9CA3AF] relative z-10">
          © 2026 TrustGraph AI Inc. All rights reserved.
        </div>
      </div>

      {/* Right Column */}
      <div className="w-full lg:w-1/2 p-8 sm:p-16 flex items-center justify-center relative">
        <div className="w-full max-w-md space-y-6 bg-white p-8 sm:p-10 rounded-3xl border border-[#E5E7EB] shadow-xs">
          <div>
            <h2 className="text-2xl font-bold text-[#2B2B2B] tracking-tight">Create Account</h2>
            <p className="text-xs text-[#6B7280] mt-1.5">Get started with AI-powered digital trust evaluation.</p>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-[#D96C6C]/10 border border-[#D96C6C]/30 rounded-xl text-xs text-[#D96C6C]">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#6B7280]">Full Name</label>
              <div className="relative mt-1">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] w-4 h-4 stroke-[1.5]" />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Sarah Connor"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl text-xs text-[#2B2B2B] focus:outline-none focus:border-[#8E9A7D]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#6B7280]">Corporate Email</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] w-4 h-4 stroke-[1.5]" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="analyst@enterprise.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl text-xs text-[#2B2B2B] focus:outline-none focus:border-[#8E9A7D]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#6B7280]">Password</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] w-4 h-4 stroke-[1.5]" />
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl text-xs text-[#2B2B2B] focus:outline-none focus:border-[#8E9A7D]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#6B7280]">Confirm Password</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] w-4 h-4 stroke-[1.5]" />
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl text-xs text-[#2B2B2B] focus:outline-none focus:border-[#8E9A7D]"
                    required
                  />
                </div>
              </div>
            </div>

            {form.password && (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[10px] font-mono text-[#6B7280]">
                  <span>Password Strength</span>
                  <span className="font-bold">{strength}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#F3F2EF] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      strength < 50 ? 'bg-[#D96C6C]' : strength < 100 ? 'bg-[#D9A441]' : 'bg-[#5B8C5A]'
                    }`}
                    style={{ width: `${strength}%` }}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-[#6B7280]">Account Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full mt-1 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-xs text-[#2B2B2B] focus:outline-none focus:border-[#8E9A7D]"
              >
                <option value="analyst">Security Analyst</option>
                <option value="user">Enterprise User</option>
                <option value="admin">System Administrator</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#8E9A7D] hover:bg-[#7F8F73] disabled:bg-[#E5E7EB] text-white font-semibold rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center space-x-2"
            >
              <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2]" />
            </button>
          </form>

          <p className="text-xs text-center text-[#6B7280] pt-2 border-t border-[#E5E7EB]">
            Already have an account?{' '}
            <NavLink to="/login" className="text-[#7F8F73] font-bold hover:underline">
              Sign In
            </NavLink>
          </p>
        </div>
      </div>
    </div>
  );
}
