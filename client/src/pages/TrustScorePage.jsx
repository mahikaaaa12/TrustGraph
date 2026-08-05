import React, { useState } from 'react';
import api from '../services/api';
import { useErrorLogs } from '../context/ErrorLogContext';
import { motion } from 'framer-motion';
import { FaShieldAlt, FaCalculator, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

export default function TrustScorePage() {
  const { showToast } = useErrorLogs();

  const [inputScores, setInputScores] = useState({
    imageScore: 82,
    documentScore: 75,
    websiteScore: 92,
    textScore: 88,
  });

  const [loading, setLoading] = useState(false);
  const [evalResult, setEvalResult] = useState({
    overallTrustScore: 84.5,
    confidenceScore: 0.96,
    riskCategory: 'low',
    breakdown: {
      authenticityIndex: 85.0,
      securityEncryption: 85.2,
      metadataProvenance: 77.8,
      sourceReputation: 90.8,
    },
  });

  const handleEvaluate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post('/trust-score/evaluate', {
        imageScore: parseFloat(inputScores.imageScore),
        documentScore: parseFloat(inputScores.documentScore),
        websiteScore: parseFloat(inputScores.websiteScore),
        textScore: parseFloat(inputScores.textScore),
      });

      if (res.data?.success) {
        setEvalResult(res.data.data);
        showToast('Multi-modal Trust Score evaluation computed!', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Trust score evaluation failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const score = evalResult?.overallTrustScore ?? 84.5;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const breakdownMetrics = [
    { name: 'Authenticity Index', score: evalResult?.breakdown?.authenticityIndex ?? 85, color: 'bg-emerald-500', barColor: 'text-emerald-400' },
    { name: 'Security & Encryption', score: evalResult?.breakdown?.securityEncryption ?? 85, color: 'bg-indigo-500', barColor: 'text-indigo-400' },
    { name: 'Metadata Provenance', score: evalResult?.breakdown?.metadataProvenance ?? 78, color: 'bg-blue-500', barColor: 'text-blue-400' },
    { name: 'Source Reputation', score: evalResult?.breakdown?.sourceReputation ?? 91, color: 'bg-amber-500', barColor: 'text-amber-400' },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Multi-Modal Trust Score Engine</h1>
        <p className="text-sm text-slate-400 mt-1">
          Weighted synthesis algorithm combining Image, Document, Website, and Text score vectors into a unified Trust Index.
        </p>
      </div>

      {/* Interactive Modality Score Input Form */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <h2 className="text-sm font-semibold text-white border-b border-slate-800 pb-3">
          Input Modality Channel Scores (0 - 100)
        </h2>

        <form onSubmit={handleEvaluate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-400">Image Forensics Score</label>
            <input
              type="number"
              min="0"
              max="100"
              value={inputScores.imageScore}
              onChange={(e) => setInputScores({ ...inputScores, imageScore: e.target.value })}
              className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400">Document PII Score</label>
            <input
              type="number"
              min="0"
              max="100"
              value={inputScores.documentScore}
              onChange={(e) => setInputScores({ ...inputScores, documentScore: e.target.value })}
              className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400">Website SSL Score</label>
            <input
              type="number"
              min="0"
              max="100"
              value={inputScores.websiteScore}
              onChange={(e) => setInputScores({ ...inputScores, websiteScore: e.target.value })}
              className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400">Text Authenticity Score</label>
            <input
              type="number"
              min="0"
              max="100"
              value={inputScores.textScore}
              onChange={(e) => setInputScores({ ...inputScores, textScore: e.target.value })}
              className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white font-mono"
            />
          </div>

          <div className="md:col-span-4 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-medium rounded-xl text-sm transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20"
            >
              <FaCalculator />
              <span>{loading ? 'Computing Weighted Score...' : 'Execute POST /api/v1/trust-score/evaluate'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Visual Score Results */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Circular Score Gauge */}
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col items-center justify-center space-y-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Overall Composite Score
          </h2>

          <div className="relative flex items-center justify-center">
            <svg className="w-48 h-48 transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r={radius}
                className="text-slate-800 stroke-current"
                strokeWidth="14"
                fill="transparent"
              />
              <motion.circle
                cx="96"
                cy="96"
                r={radius}
                className="text-emerald-400 stroke-current"
                strokeWidth="14"
                fill="transparent"
                strokeDasharray={circumference}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-4xl font-extrabold text-white">{score}</span>
              <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mt-1">
                {evalResult?.riskCategory?.toUpperCase()} RISK
              </span>
            </div>
          </div>

          <div className="text-center text-xs text-slate-400 space-y-1">
            <p>Confidence Level: {evalResult?.confidenceScore * 100}%</p>
          </div>
        </div>

        {/* Dimension Breakdown Bars */}
        <div className="md:col-span-2 p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
          <h2 className="text-base font-semibold text-white border-b border-slate-800 pb-3">
            Weighted Strategic Category Breakdown
          </h2>

          <div className="space-y-5">
            {breakdownMetrics.map((item) => (
              <div key={item.name} className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-300">{item.name}</span>
                  <span className={`font-bold ${item.barColor}`}>{item.score} / 100</span>
                </div>
                <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <motion.div
                    className={`h-full ${item.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.score}%` }}
                    transition={{ duration: 1 }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-start space-x-3 text-xs text-slate-400">
            <FaShieldAlt className="text-blue-400 text-lg flex-shrink-0 mt-0.5" />
            <p>
              Weighted Formula: (Authenticity × 0.35) + (Security × 0.25) + (Metadata × 0.20) + (Reputation × 0.20).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
