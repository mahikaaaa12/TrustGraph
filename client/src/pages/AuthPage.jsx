import React, { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useErrorLogs } from '../context/ErrorLogContext';
import { FaUserPlus, FaSignInAlt, FaKey, FaUserCheck, FaSignOutAlt } from 'react-icons/fa';

export default function AuthPage() {
  const { token, user, login, logout } = useAuth();
  const { showToast } = useErrorLogs();

  const [activeTab, setActiveTab] = useState('login');

  // Signup State
  const [signupForm, setSignupForm] = useState({
    name: 'Sarah Connor',
    email: 'sarah@cyberdyne.org',
    password: 'Password123!',
    role: 'analyst',
  });

  // Login State
  const [loginForm, setLoginForm] = useState({
    email: 'sarah@cyberdyne.org',
    password: 'Password123!',
  });

  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    try {
      const res = await api.post('/auth/signup', signupForm);
      if (res.data?.success) {
        login(res.data.data.token, res.data.data.user);
        showToast('Signup successful! Session token issued.', 'success');
      }
    } catch (err) {
      setAuthError(err.message || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    try {
      const res = await api.post('/auth/login', loginForm);
      if (res.data?.success) {
        login(res.data.data.token, res.data.data.user);
        showToast('Login successful!', 'success');
      }
    } catch (err) {
      setAuthError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Authentication Module Test Harness</h1>
        <p className="text-sm text-slate-400 mt-1">
          Verify user registration, password hashing, JWT issue, and session persistence.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Form Column */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
          {/* Tab Switcher */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'login'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Login Form
            </button>
            <button
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'signup'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Signup Form
            </button>
          </div>

          {authError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl">
              {authError}
            </div>
          )}

          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400">Email Address</label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400">Password</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-sm transition-colors flex items-center justify-center space-x-2"
              >
                <FaSignInAlt />
                <span>{loading ? 'Authenticating...' : 'Execute POST /api/v1/auth/login'}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400">Full Name</label>
                <input
                  type="text"
                  value={signupForm.name}
                  onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400">Email Address</label>
                <input
                  type="email"
                  value={signupForm.email}
                  onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400">Password</label>
                <input
                  type="password"
                  value={signupForm.password}
                  onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400">Role</label>
                <select
                  value={signupForm.role}
                  onChange={(e) => setSignupForm({ ...signupForm, role: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="user">User</option>
                  <option value="analyst">Analyst</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-sm transition-colors flex items-center justify-center space-x-2"
              >
                <FaUserPlus />
                <span>{loading ? 'Creating User...' : 'Execute POST /api/v1/auth/signup'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Token & Session Column */}
        <div className="space-y-6">
          {/* JWT Token Card */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              <FaKey className="text-amber-400" />
              <h2 className="text-sm font-semibold text-white">Active JWT Session Token</h2>
            </div>
            {token ? (
              <div className="space-y-3">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 break-all text-xs font-mono text-amber-300 max-h-32 overflow-y-auto">
                  {token}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Attached to Axios Authorization Header</span>
                  <button
                    onClick={logout}
                    className="text-rose-400 hover:underline flex items-center space-x-1"
                  >
                    <FaSignOutAlt />
                    <span>Clear Token (Logout)</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No active JWT token stored in localStorage.</p>
            )}
          </div>

          {/* User Payload Card */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              <FaUserCheck className="text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">Logged-in User Payload (req.user)</h2>
            </div>
            {user ? (
              <pre className="p-3 bg-slate-950 rounded-xl text-xs font-mono text-emerald-400 border border-slate-800 overflow-x-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            ) : (
              <p className="text-xs text-slate-500 italic">Authenticate to inspect session user object.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
