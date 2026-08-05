import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useErrorLogs } from '../context/ErrorLogContext';
import { FaShieldAlt, FaUser, FaEnvelope, FaLock, FaArrowRight, FaCheckCircle } from 'react-icons/fa';

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

  // Compute password strength (0 to 100)
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
    <div className="min-h-screen bg-[#0B1220] flex text-slate-100 font-sans">
      {/* Left Column: Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-950 p-16 flex-col justify-between border-r border-slate-800/80 relative overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />

        <NavLink to="/" className="flex items-center space-x-3 group relative z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
            <FaShieldAlt className="text-xl" />
          </div>
          <span className="text-2xl font-black text-white tracking-wide">
            Trust<span className="text-blue-500">Graph</span>
          </span>
        </NavLink>

        <div className="space-y-6 relative z-10 max-w-lg">
          <h1 className="text-4xl font-extrabold text-white leading-tight">
            Join Enterprise Security Teams Worldwide
          </h1>
          <div className="space-y-3 text-xs text-slate-400">
            <div className="flex items-center space-x-3">
              <FaCheckCircle className="text-emerald-400 text-base" />
              <span>Multi-modal AI evaluation across PDF, DOCX, and image files</span>
            </div>
            <div className="flex items-center space-x-3">
              <FaCheckCircle className="text-emerald-400 text-base" />
              <span>Real-time SSL certificate and WHOIS threat blacklists</span>
            </div>
            <div className="flex items-center space-x-3">
              <FaCheckCircle className="text-emerald-400 text-base" />
              <span>Executive compliance report exports with SOC2 metrics</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-600 relative z-10">
          © 2026 TrustGraph AI Inc. All rights reserved.
        </div>
      </div>

      {/* Right Column: Signup Form */}
      <div className="w-full lg:w-1/2 p-8 sm:p-16 flex items-center justify-center relative">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">Create Account</h2>
            <p className="text-xs text-slate-400 mt-2">Get started with AI-powered digital trust evaluation.</p>
          </div>

          {errorMsg && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400">Full Name</label>
              <div className="relative mt-1">
                <FaUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Sarah Connor"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Corporate Email</label>
              <div className="relative mt-1">
                <FaEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="analyst@enterprise.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Password</label>
                <div className="relative mt-1">
                  <FaLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Confirm Password</label>
                <div className="relative mt-1">
                  <FaLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Password Strength Meter */}
            {form.password && (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>Password Strength</span>
                  <span className="font-bold">{strength}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      strength < 50 ? 'bg-rose-500' : strength < 100 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${strength}%` }}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-400">Account Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="analyst font-mono">Security Analyst</option>
                <option value="user">Enterprise User</option>
                <option value="admin">System Administrator</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2"
            >
              <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
              <FaArrowRight />
            </button>
          </form>

          <p className="text-xs text-center text-slate-400">
            Already have an account?{' '}
            <NavLink to="/login" className="text-blue-400 font-bold hover:underline">
              Sign In
            </NavLink>
          </p>
        </div>
      </div>
    </div>
  );
}
