import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useErrorLogs } from '../context/ErrorLogContext';
import { motion, AnimatePresence } from 'framer-motion';
import AnalysisLoader from '../components/common/AnalysisLoader';
import {
  Play,
  Shield,
  AlertTriangle,
  CheckCircle,
  Activity,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Cpu,
  Layers,
  RotateCcw,
  Zap,
  ShieldAlert,
  Flame,
  Search,
  Sparkles,
  Info,
  X,
  Share2,
  Sliders,
  Check,
} from 'lucide-react';

export default function SimulatorPage() {
  const { showToast } = useErrorLogs();
  const [activeMode, setActiveMode] = useState('SINGLE'); // 'SINGLE' | 'STREAM'

  // Single Transaction Simulator State
  const [form, setForm] = useState({
    amount: 120,
    currency: 'USD',
    customerAge: 34,
    accountAge: 180,
    merchantAge: 450,
    failedAttempts: 0,
    transactionVelocity: 2,
    deviceAge: 120,
    deviceChanged: 0,
    ipRisk: 0.05,
    countryMismatch: 0,
    emailAge: 365,
    previousChargebacks: 0,
    refundRatio: 0.0,
    sharedDeviceCount: 1,
    sharedIpCount: 1,
  });

  const [formErrors, setFormErrors] = useState({});
  const [analyzing, setAnalyzing] = useState(false);
  const [decisionResult, setDecisionResult] = useState(null);
  const [selectedFactorModal, setSelectedFactorModal] = useState(null);

  // Stream Simulator State
  const [scenario, setScenario] = useState('CARD_TESTING_BURST');
  const [streamCount, setStreamCount] = useState(20);
  const [streamLoading, setStreamLoading] = useState(false);
  const [simulationData, setSimulationData] = useState(null);

  // Synthetic Presets
  const syntheticPresets = {
    LEGITIMATE: {
      name: '1. Legitimate Transaction (Synthetic)',
      description: 'Established account with dedicated hardware, clean IP, and low velocity.',
      data: {
        amount: 85.0,
        currency: 'USD',
        customerAge: 38,
        accountAge: 365,
        merchantAge: 600,
        failedAttempts: 0,
        transactionVelocity: 1,
        deviceAge: 240,
        deviceChanged: 0,
        ipRisk: 0.02,
        countryMismatch: 0,
        emailAge: 500,
        previousChargebacks: 0,
        refundRatio: 0.01,
        sharedDeviceCount: 1,
        sharedIpCount: 1,
      },
    },
    SUSPICIOUS: {
      name: '2. Suspicious High-Velocity Burst (Synthetic)',
      description: 'Recent account with rapid transaction burst, proxy IP, and geo-mismatch.',
      data: {
        amount: 450.0,
        currency: 'USD',
        customerAge: 24,
        accountAge: 12,
        merchantAge: 90,
        failedAttempts: 2,
        transactionVelocity: 9,
        deviceAge: 5,
        deviceChanged: 2,
        ipRisk: 0.75,
        countryMismatch: 1,
        emailAge: 20,
        previousChargebacks: 1,
        refundRatio: 0.15,
        sharedDeviceCount: 2,
        sharedIpCount: 3,
      },
    },
    ABUSE_RING: {
      name: '3. Abuse-Ring Sybil Collusion (Synthetic)',
      description: 'Multiple accounts sharing device hardware and IP subnet with prior chargebacks.',
      data: {
        amount: 1450.0,
        currency: 'USD',
        customerAge: 29,
        accountAge: 3,
        merchantAge: 30,
        failedAttempts: 5,
        transactionVelocity: 16,
        deviceAge: 1,
        deviceChanged: 4,
        ipRisk: 0.95,
        countryMismatch: 1,
        emailAge: 2,
        previousChargebacks: 3,
        refundRatio: 0.40,
        sharedDeviceCount: 6,
        sharedIpCount: 8,
      },
    },
  };

  const validateForm = () => {
    const errs = {};
    if (isNaN(Number(form.amount)) || Number(form.amount) < 0) {
      errs.amount = 'Amount must be a non-negative number';
    }
    if (isNaN(Number(form.customerAge)) || Number(form.customerAge) < 18) {
      errs.customerAge = 'Customer age must be ≥ 18';
    }
    if (isNaN(Number(form.accountAge)) || Number(form.accountAge) < 0) {
      errs.accountAge = 'Account age must be ≥ 0';
    }
    if (isNaN(Number(form.merchantAge)) || Number(form.merchantAge) < 0) {
      errs.merchantAge = 'Merchant age must be ≥ 0';
    }
    if (isNaN(Number(form.failedAttempts)) || Number(form.failedAttempts) < 0) {
      errs.failedAttempts = 'Failed attempts must be ≥ 0';
    }
    if (isNaN(Number(form.transactionVelocity)) || Number(form.transactionVelocity) < 1) {
      errs.transactionVelocity = 'Velocity must be ≥ 1';
    }
    if (isNaN(Number(form.ipRisk)) || Number(form.ipRisk) < 0 || Number(form.ipRisk) > 1) {
      errs.ipRisk = 'IP risk must be between 0.0 and 1.0';
    }
    if (isNaN(Number(form.refundRatio)) || Number(form.refundRatio) < 0 || Number(form.refundRatio) > 1) {
      errs.refundRatio = 'Refund ratio must be between 0.0 and 1.0';
    }
    if (isNaN(Number(form.sharedDeviceCount)) || Number(form.sharedDeviceCount) < 1) {
      errs.sharedDeviceCount = 'Shared device count must be ≥ 1';
    }
    if (isNaN(Number(form.sharedIpCount)) || Number(form.sharedIpCount) < 1) {
      errs.sharedIpCount = 'Shared IP count must be ≥ 1';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAnalyzeTransaction = async (e) => {
    if (e) e.preventDefault();
    if (!validateForm()) {
      showToast('Please correct validation errors before analyzing.', 'error');
      return;
    }

    setAnalyzing(true);
    try {
      const payload = {
        transactionAmount: Number(form.amount),
        customerAge: Number(form.customerAge),
        accountAge: Number(form.accountAge),
        merchantAge: Number(form.merchantAge),
        failedAttempts: Number(form.failedAttempts),
        transactionVelocity: Number(form.transactionVelocity),
        deviceAge: Number(form.deviceAge),
        deviceChanges: Number(form.deviceChanged),
        ipRisk: Number(form.ipRisk),
        countryMismatch: Number(form.countryMismatch),
        emailAge: Number(form.emailAge),
        chargebackHistory: Number(form.previousChargebacks),
        refundRatio: Number(form.refundRatio),
        sharedDeviceCount: Number(form.sharedDeviceCount),
        sharedIpCount: Number(form.sharedIpCount),
      };

      const res = await api.post('/trust-score/decision', payload);
      if (res.data?.success) {
        setDecisionResult(res.data.data);
        showToast(`Transaction analyzed: ${res.data.data.decision}`, 'success');
      }
    } catch (err) {
      showToast(err.message || 'Transaction analysis failed.', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLoadPreset = (presetKey) => {
    const preset = syntheticPresets[presetKey];
    if (preset) {
      setForm(preset.data);
      setFormErrors({});
      showToast(`Loaded ${preset.name}`, 'info');
    }
  };

  const handleRunStreamSimulation = async (e) => {
    if (e) e.preventDefault();
    setStreamLoading(true);

    try {
      const res = await api.post('/trust-score/simulate', {
        scenario,
        count: Number(streamCount),
      });

      if (res.data?.success) {
        setSimulationData(res.data.data);
        showToast(`Stream simulation completed: ${streamCount} transactions evaluated!`, 'success');
      }
    } catch (err) {
      showToast(err.message || 'Simulation failed.', 'error');
    } finally {
      setStreamLoading(false);
    }
  };

  useEffect(() => {
    handleAnalyzeTransaction();
  }, []);

  const decision = decisionResult?.decision || 'ALLOW';
  const riskScore = decisionResult?.riskScore ?? 12.0;
  const fraudProb = decisionResult?.fraudProbability ?? 0.12;
  const expLoss = decisionResult?.expectedLoss ?? (fraudProb * Number(form.amount || 0));
  const topFactors = decisionResult?.topRiskFactors || [];
  const graphEv = decisionResult?.graphEvidence || {};

  const getDecisionBadge = (dec) => {
    switch (dec) {
      case 'BLOCK':
        return { label: 'BLOCK', bg: 'bg-[#D96C6C]/15', text: 'text-[#D96C6C]', border: 'border-[#D96C6C]/30', icon: ShieldAlert };
      case 'REVIEW':
        return { label: 'REVIEW', bg: 'bg-[#D9A441]/15', text: 'text-[#D9A441]', border: 'border-[#D9A441]/30', icon: AlertTriangle };
      case 'ALLOW':
      default:
        return { label: 'ALLOW', bg: 'bg-[#5B8C5A]/15', text: 'text-[#5B8C5A]', border: 'border-[#5B8C5A]/30', icon: CheckCircle };
    }
  };

  const badge = getDecisionBadge(decision);
  const BadgeIcon = badge.icon;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header & Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2B2B2B] tracking-tight">Interactive Transaction Risk Simulator</h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Testing & demonstration interface wired directly to the production ML Risk and Policy Engine.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-white border border-[#E5E7EB] p-1 rounded-xl shadow-xs text-xs font-semibold">
          <button
            onClick={() => setActiveMode('SINGLE')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeMode === 'SINGLE' ? 'bg-[#8E9A7D] text-white shadow-xs' : 'text-[#6B7280] hover:text-[#2B2B2B]'
            }`}
          >
            Single Transaction Analyzer
          </button>
          <button
            onClick={() => {
              setActiveMode('STREAM');
              if (!simulationData) handleRunStreamSimulation();
            }}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeMode === 'STREAM' ? 'bg-[#8E9A7D] text-white shadow-xs' : 'text-[#6B7280] hover:text-[#2B2B2B]'
            }`}
          >
            Attack Stream Simulator
          </button>
        </div>
      </div>

      {activeMode === 'SINGLE' ? (
        <>
          {/* Synthetic Preset Selector */}
          <div className="p-4 bg-white rounded-2xl border border-[#E5E7EB] shadow-xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E7EB] pb-2">
              <span className="text-xs font-semibold text-[#2B2B2B] flex items-center space-x-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#8E9A7D]" />
                <span>Load Synthetic Benchmark Example</span>
              </span>
              <span className="text-[11px] text-[#9CA3AF]">
                *Synthetic test presets. Does not represent real customer data.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {Object.entries(syntheticPresets).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleLoadPreset(key)}
                  className="p-3 bg-[#F8F7F4] hover:bg-[#8E9A7D]/10 hover:border-[#8E9A7D] border border-[#E5E7EB] rounded-xl text-left transition-all space-y-1 group"
                >
                  <strong className="text-xs text-[#2B2B2B] group-hover:text-[#7F8F73] block">{item.name}</strong>
                  <p className="text-[11px] text-[#6B7280] leading-snug">{item.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Form & Real-time Live Decision Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Input Form (7 Columns) */}
            <div className="lg:col-span-7 p-6 bg-white rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-[#2B2B2B] border-b border-[#E5E7EB] pb-3 flex items-center space-x-2">
                <Activity className="w-4 h-4 text-[#8E9A7D]" />
                <span>Telemetry Input Parameters</span>
              </h3>

              <form onSubmit={handleAnalyzeTransaction} className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* Amount */}
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B7280]">Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      className={`w-full mt-1 bg-[#F8F7F4] border rounded-xl px-3 py-2 text-xs font-mono text-[#2B2B2B] focus:border-[#8E9A7D] ${formErrors.amount ? 'border-[#D96C6C]' : 'border-[#E5E7EB]'}`}
                    />
                    {formErrors.amount && <span className="text-[10px] text-[#D96C6C]">{formErrors.amount}</span>}
                  </div>

                  {/* Currency */}
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B7280]">Currency</label>
                    <select
                      value={form.currency}
                      onChange={(e) => setForm({ ...form, currency: e.target.value })}
                      className="w-full mt-1 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-mono text-[#2B2B2B]"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="INR">INR (₹)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>

                  {/* Customer Age */}
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B7280]">Customer Age (Yrs)</label>
                    <input
                      type="number"
                      value={form.customerAge}
                      onChange={(e) => setForm({ ...form, customerAge: e.target.value })}
                      className={`w-full mt-1 bg-[#F8F7F4] border rounded-xl px-3 py-2 text-xs font-mono text-[#2B2B2B] ${formErrors.customerAge ? 'border-[#D96C6C]' : 'border-[#E5E7EB]'}`}
                    />
                  </div>

                  {/* Account Age */}
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B7280]">Account Age (Days)</label>
                    <input
                      type="number"
                      value={form.accountAge}
                      onChange={(e) => setForm({ ...form, accountAge: e.target.value })}
                      className="w-full mt-1 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-mono text-[#2B2B2B]"
                    />
                  </div>

                  {/* Merchant Age */}
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B7280]">Merchant Age (Days)</label>
                    <input
                      type="number"
                      value={form.merchantAge}
                      onChange={(e) => setForm({ ...form, merchantAge: e.target.value })}
                      className="w-full mt-1 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-mono text-[#2B2B2B]"
                    />
                  </div>

                  {/* Velocity */}
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B7280]">Velocity (ev/hr)</label>
                    <input
                      type="number"
                      value={form.transactionVelocity}
                      onChange={(e) => setForm({ ...form, transactionVelocity: e.target.value })}
                      className="w-full mt-1 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-mono text-[#2B2B2B]"
                    />
                  </div>

                  {/* Failed Attempts */}
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B7280]">Failed Attempts</label>
                    <input
                      type="number"
                      value={form.failedAttempts}
                      onChange={(e) => setForm({ ...form, failedAttempts: e.target.value })}
                      className="w-full mt-1 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-mono text-[#2B2B2B]"
                    />
                  </div>

                  {/* Device Age */}
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B7280]">Device Age (Days)</label>
                    <input
                      type="number"
                      value={form.deviceAge}
                      onChange={(e) => setForm({ ...form, deviceAge: e.target.value })}
                      className="w-full mt-1 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-mono text-[#2B2B2B]"
                    />
                  </div>

                  {/* Device Changed */}
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B7280]">Device Changes</label>
                    <input
                      type="number"
                      value={form.deviceChanged}
                      onChange={(e) => setForm({ ...form, deviceChanged: e.target.value })}
                      className="w-full mt-1 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-mono text-[#2B2B2B]"
                    />
                  </div>

                  {/* IP Risk */}
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B7280]">IP Risk (0 - 1.0)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={form.ipRisk}
                      onChange={(e) => setForm({ ...form, ipRisk: e.target.value })}
                      className="w-full mt-1 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-mono text-[#2B2B2B]"
                    />
                  </div>

                  {/* Country Mismatch */}
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B7280]">Geo Mismatch</label>
                    <select
                      value={form.countryMismatch}
                      onChange={(e) => setForm({ ...form, countryMismatch: Number(e.target.value) })}
                      className="w-full mt-1 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-mono text-[#2B2B2B]"
                    >
                      <option value={0}>0 (Matched Country)</option>
                      <option value={1}>1 (Geo Mismatch)</option>
                    </select>
                  </div>

                  {/* Email Age */}
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B7280]">Email Age (Days)</label>
                    <input
                      type="number"
                      value={form.emailAge}
                      onChange={(e) => setForm({ ...form, emailAge: e.target.value })}
                      className="w-full mt-1 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-mono text-[#2B2B2B]"
                    />
                  </div>

                  {/* Chargebacks */}
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B7280]">Prior Chargebacks</label>
                    <input
                      type="number"
                      value={form.previousChargebacks}
                      onChange={(e) => setForm({ ...form, previousChargebacks: e.target.value })}
                      className="w-full mt-1 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-mono text-[#2B2B2B]"
                    />
                  </div>

                  {/* Refund Ratio */}
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B7280]">Refund Ratio (0 - 1)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={form.refundRatio}
                      onChange={(e) => setForm({ ...form, refundRatio: e.target.value })}
                      className="w-full mt-1 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-mono text-[#2B2B2B]"
                    />
                  </div>

                  {/* Shared Devices */}
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B7280]">Shared Devices</label>
                    <input
                      type="number"
                      min="1"
                      value={form.sharedDeviceCount}
                      onChange={(e) => setForm({ ...form, sharedDeviceCount: e.target.value })}
                      className="w-full mt-1 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-mono text-[#2B2B2B]"
                    />
                  </div>

                  {/* Shared IPs */}
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B7280]">Shared IPs</label>
                    <input
                      type="number"
                      min="1"
                      value={form.sharedIpCount}
                      onChange={(e) => setForm({ ...form, sharedIpCount: e.target.value })}
                      className="w-full mt-1 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-mono text-[#2B2B2B]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={analyzing}
                  className="w-full py-3.5 bg-[#8E9A7D] hover:bg-[#7F8F73] disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center space-x-2 shadow-xs"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{analyzing ? 'Executing Backend Decision Pipeline...' : 'Analyze Transaction'}</span>
                </button>
              </form>
            </div>

            {/* Live Result View (5 Columns) */}
            <div className="lg:col-span-5 space-y-4">
              {analyzing && (
                <AnalysisLoader
                  message="Evaluating Risk Decision Pipeline..."
                  subMessage="Processing transaction telemetry against ML ensemble models, graph risk signals, and policy engine..."
                />
              )}

              {!analyzing && (
                <>
                  {/* Fallback Active Banner */}
                  {decisionResult?.isFallback && (
                    <div className="p-4 bg-[#D9A441]/15 border border-[#D9A441] rounded-2xl flex items-start space-x-3 text-xs">
                      <AlertTriangle className="w-5 h-5 text-[#D9A441] flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-[#2B2B2B] block">ML model unavailable — deterministic fallback active.</strong>
                        <span className="text-[#6B7280]">System automatically enforces safety review rules.</span>
                      </div>
                    </div>
                  )}

              {/* Decision Hero Card */}
              <div className={`p-6 bg-white rounded-2xl border ${badge.border} shadow-xs space-y-4`}>
                <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2.5 rounded-xl ${badge.bg} ${badge.text}`}>
                      <BadgeIcon className="w-6 h-6 stroke-[2]" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">Decision</span>
                      <p className={`text-2xl font-black ${badge.text}`}>{decision}</p>
                    </div>
                  </div>

                  <div className="text-right font-mono text-xs text-[#6B7280]">
                    <span>Score: <strong className="text-[#2B2B2B]">{riskScore}%</strong></span>
                    <span className="block text-[11px]">Fraud P: {(fraudProb * 100).toFixed(1)}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  <div className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB]">
                    <span className="text-[10px] text-[#9CA3AF] uppercase block">Expected Loss</span>
                    <strong className="text-base text-[#2B2B2B]">${expLoss.toFixed(2)}</strong>
                  </div>

                  <div className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB]">
                    <span className="text-[10px] text-[#9CA3AF] uppercase block">Graph Risk Signal</span>
                    <strong className="text-base text-[#7F8F73]">{graphEv.graphRiskScore || 10}%</strong>
                  </div>
                </div>

                <div className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] text-xs">
                  <span className="text-[#9CA3AF] text-[10px] uppercase font-mono block">Policy Explanation</span>
                  <p className="text-[#2B2B2B] font-mono leading-snug mt-0.5">{decisionResult?.decisionReason}</p>
                </div>

                <div className="flex justify-between items-center text-[10px] font-mono text-[#9CA3AF] pt-1">
                  <span>Policy: {decisionResult?.policyVersion || 'policies-v1.2.0'}</span>
                  <span>Model: {decisionResult?.modelVersion || 'gbdt-risk-v1.0.0'}</span>
                </div>
              </div>

              {/* Directional Factors List */}
              <div className="p-5 bg-white rounded-2xl border border-[#E5E7EB] shadow-xs space-y-3">
                <span className="text-xs font-bold text-[#2B2B2B] flex items-center justify-between border-b border-[#E5E7EB] pb-2">
                  <span>Top Risk Factors</span>
                  <span className="text-[10px] text-[#9CA3AF] font-mono">Click for Evidence</span>
                </span>

                <div className="space-y-2">
                  {topFactors.map((factor, idx) => {
                    const isInc = factor.direction === 'increase_risk';
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedFactorModal(factor)}
                        className={`p-3 rounded-xl border cursor-pointer hover:shadow-xs transition-all flex items-center justify-between ${
                          isInc ? 'bg-[#D96C6C]/10 border-[#D96C6C]/25 hover:border-[#D96C6C]' : 'bg-[#5B8C5A]/10 border-[#5B8C5A]/25 hover:border-[#5B8C5A]'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <strong className="text-xs text-[#2B2B2B] font-mono block">{factor.feature}</strong>
                          <p className="text-[11px] text-[#6B7280] line-clamp-1">{factor.humanReadableExplanation}</p>
                        </div>
                        <span className={`text-[10px] font-bold font-mono uppercase px-2 py-0.5 rounded ${isInc ? 'text-[#D96C6C] bg-[#D96C6C]/20' : 'text-[#5B8C5A] bg-[#5B8C5A]/20'}`}>
                          {isInc ? `+${factor.contribution}` : `-${factor.contribution}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
                </>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Multi-Event Stream Simulator */
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
            <h2 className="text-xs font-semibold text-[#2B2B2B] border-b border-[#E5E7EB] pb-3 flex items-center space-x-2">
              <Zap className="w-4 h-4 text-[#8E9A7D]" />
              <span>Select High-Throughput Attack Scenario</span>
            </h2>

            <form onSubmit={handleRunStreamSimulation} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                  { id: 'NORMAL_COMMERCE', name: 'Normal Commerce', icon: CheckCircle },
                  { id: 'CARD_TESTING_BURST', name: 'Card Testing Burst', icon: Flame },
                  { id: 'ACCOUNT_TAKEOVER', name: 'Account Takeover', icon: ShieldAlert },
                  { id: 'ABUSE_RING_COLLUSION', name: 'Sybil Abuse Ring', icon: Layers },
                  { id: 'PHISHING_CREDENTIAL_DRAIN', name: 'Phishing Drain', icon: AlertTriangle },
                ].map((sc) => {
                  const Icon = sc.icon;
                  const isSelected = scenario === sc.id;
                  return (
                    <button
                      type="button"
                      key={sc.id}
                      onClick={() => setScenario(sc.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2 ${
                        isSelected
                          ? 'bg-[#8E9A7D]/15 border-[#8E9A7D] text-[#2B2B2B] shadow-xs font-bold'
                          : 'bg-[#F8F7F4] border-[#E5E7EB] text-[#6B7280] hover:text-[#2B2B2B]'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-[#7F8F73]' : 'text-[#9CA3AF]'}`} />
                        {isSelected && <span className="w-2 h-2 rounded-full bg-[#8E9A7D]" />}
                      </div>
                      <span className="text-xs">{sc.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between p-3.5 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] text-xs text-[#6B7280]">
                <span>Scenario Event Count:</span>
                <select
                  value={streamCount}
                  onChange={(e) => setStreamCount(Number(e.target.value))}
                  className="bg-white border border-[#E5E7EB] rounded-lg px-3 py-1 font-mono text-xs text-[#2B2B2B]"
                >
                  <option value={10}>10 Events</option>
                  <option value={20}>20 Events</option>
                  <option value={35}>35 Events</option>
                  <option value={50}>50 Events</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={streamLoading}
                className="w-full py-3.5 bg-[#8E9A7D] hover:bg-[#7F8F73] disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center space-x-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{streamLoading ? 'Running Stream Simulation...' : `Simulate ${scenario} Stream`}</span>
              </button>
            </form>
          </div>

          {/* Stream Loader */}
          {streamLoading && (
            <AnalysisLoader
              message={`Simulating ${scenario} Event Stream...`}
              subMessage={`Evaluating ${streamCount} synthetic attack events through multi-model decision pipeline...`}
              batch={true}
            />
          )}

          {/* Stream Summary Table */}
          {!streamLoading && simulationData && (
            <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-3">
                <h3 className="text-base font-bold text-[#2B2B2B]">Live Simulated Telemetry Event Stream</h3>
                <span className="text-xs font-mono text-[#5B8C5A] font-semibold">● STREAM COMPLETE</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#F8F7F4] text-[#6B7280] font-semibold uppercase">
                    <tr>
                      <th className="p-3.5 rounded-l-xl">Event ID</th>
                      <th className="p-3.5">User</th>
                      <th className="p-3.5">Amount</th>
                      <th className="p-3.5">ML Fraud Prob</th>
                      <th className="p-3.5">Exp Loss</th>
                      <th className="p-3.5">Policy Rationale</th>
                      <th className="p-3.5 rounded-r-xl">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {simulationData.events?.map((item) => (
                      <tr key={item.event.id} className="hover:bg-[#F8F7F4] transition-colors">
                        <td className="p-3.5 text-[#2B2B2B] font-bold truncate max-w-[120px]">{item.event.id.substring(0, 14)}...</td>
                        <td className="p-3.5 text-[#6B7280]">{item.event.user}</td>
                        <td className="p-3.5 text-[#2B2B2B] font-bold">${item.event.amount.toFixed(2)}</td>
                        <td className="p-3.5 text-[#D96C6C] font-bold">{(item.prediction.fraudProbability * 100).toFixed(1)}%</td>
                        <td className="p-3.5 text-[#6B7280]">${item.loss.expectedLossUSD.toFixed(2)}</td>
                        <td className="p-3.5 text-[#6B7280] font-sans truncate max-w-xs">
                          {item.policy.triggeredPolicy ? item.policy.triggeredPolicy.name : 'Normal limits'}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              item.finalAction === 'REJECT_BLOCK'
                                ? 'bg-[#D96C6C]/15 text-[#D96C6C]'
                                : item.finalAction === 'MANUAL_REVIEW' || item.finalAction === 'STEP_UP_KYC'
                                ? 'bg-[#D9A441]/15 text-[#D9A441]'
                                : 'bg-[#5B8C5A]/15 text-[#5B8C5A]'
                            }`}
                          >
                            {item.finalAction}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Factor Evidence Detail Modal */}
      <AnimatePresence>
        {selectedFactorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#E5E7EB] space-y-4 text-xs"
            >
              <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-[#8E9A7D]" />
                  <span className="font-bold text-[#2B2B2B]">Risk Factor Telemetry Evidence: {selectedFactorModal.feature}</span>
                </div>
                <button
                  onClick={() => setSelectedFactorModal(null)}
                  className="p-1 text-[#9CA3AF] hover:text-[#2B2B2B] rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 font-mono">
                <div className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1">
                  <span className="text-[#9CA3AF] text-[10px] uppercase">Observed Telemetry</span>
                  <p className="text-lg font-bold text-[#2B2B2B]">{String(selectedFactorModal.value)}</p>
                </div>

                <div className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1">
                  <span className="text-[#9CA3AF] text-[10px] uppercase">Decision Direction</span>
                  <p className={`text-sm font-bold uppercase ${selectedFactorModal.direction === 'increase_risk' ? 'text-[#D96C6C]' : 'text-[#5B8C5A]'}`}>
                    {selectedFactorModal.direction.replace('_', ' ')} (+{selectedFactorModal.contribution} Impact)
                  </p>
                </div>

                <div className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1 font-sans">
                  <span className="text-[#9CA3AF] text-[10px] uppercase font-mono">Forensic Reason</span>
                  <p className="text-xs text-[#2B2B2B] leading-relaxed">{selectedFactorModal.humanReadableExplanation}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedFactorModal(null)}
                className="w-full py-2.5 bg-[#8E9A7D] hover:bg-[#7F8F73] text-white rounded-xl font-semibold transition-colors"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
