import React, { useState } from 'react';
import api from '../services/api';
import { useErrorLogs } from '../context/ErrorLogContext';
import { motion } from 'framer-motion';
import { Shield, Calculator, ShieldCheck, AlertCircle } from 'lucide-react';

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
    { name: 'Authenticity Index', score: evalResult?.breakdown?.authenticityIndex ?? 85, color: 'bg-[#8E9A7D]', barColor: 'text-[#7F8F73]' },
    { name: 'Security & Encryption', score: evalResult?.breakdown?.securityEncryption ?? 85, color: 'bg-[#5B8C5A]', barColor: 'text-[#5B8C5A]' },
    { name: 'Metadata Provenance', score: evalResult?.breakdown?.metadataProvenance ?? 78, color: 'bg-[#D9A441]', barColor: 'text-[#D9A441]' },
    { name: 'Source Reputation', score: evalResult?.breakdown?.sourceReputation ?? 91, color: 'bg-[#7F8F73]', barColor: 'text-[#7F8F73]' },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#2B2B2B] tracking-tight">Multi-Modal Trust Score Engine</h1>
        <p className="text-xs text-[#6B7280] mt-1">
          Weighted synthesis algorithm combining Image, Document, Website, and Text score vectors into a unified Trust Index.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-4">
        <h2 className="text-xs font-semibold text-[#2B2B2B] border-b border-[#E5E7EB] pb-3">
          Input Modality Channel Scores (0 - 100)
        </h2>

        <form onSubmit={handleEvaluate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-semibold text-[#6B7280]">Image Forensics Score</label>
            <input
              type="number"
              min="0"
              max="100"
              value={inputScores.imageScore}
              onChange={(e) => setInputScores({ ...inputScores, imageScore: e.target.value })}
              className="w-full mt-1 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs text-[#2B2B2B] font-mono focus:outline-none focus:border-[#8E9A7D]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#6B7280]">Document PII Score</label>
            <input
              type="number"
              min="0"
              max="100"
              value={inputScores.documentScore}
              onChange={(e) => setInputScores({ ...inputScores, documentScore: e.target.value })}
              className="w-full mt-1 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs text-[#2B2B2B] font-mono focus:outline-none focus:border-[#8E9A7D]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#6B7280]">Website SSL Score</label>
            <input
              type="number"
              min="0"
              max="100"
              value={inputScores.websiteScore}
              onChange={(e) => setInputScores({ ...inputScores, websiteScore: e.target.value })}
              className="w-full mt-1 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs text-[#2B2B2B] font-mono focus:outline-none focus:border-[#8E9A7D]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#6B7280]">Text Authenticity Score</label>
            <input
              type="number"
              min="0"
              max="100"
              value={inputScores.textScore}
              onChange={(e) => setInputScores({ ...inputScores, textScore: e.target.value })}
              className="w-full mt-1 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs text-[#2B2B2B] font-mono focus:outline-none focus:border-[#8E9A7D]"
            />
          </div>

          <div className="md:col-span-4 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#8E9A7D] hover:bg-[#7F8F73] disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF] text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center space-x-2 shadow-xs"
            >
              <Calculator className="w-4 h-4 stroke-[1.75]" />
              <span>{loading ? 'Computing Weighted Score...' : 'Execute Multi-Modal Evaluation'}</span>
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-8 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs flex flex-col items-center justify-center space-y-6">
          <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
            Overall Composite Score
          </h2>

          <div className="relative flex items-center justify-center">
            <svg className="w-48 h-48 transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r={radius}
                className="text-[#F3F2EF] stroke-current"
                strokeWidth="12"
                fill="transparent"
              />
              <motion.circle
                cx="96"
                cy="96"
                r={radius}
                className="text-[#8E9A7D] stroke-current"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={circumference}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-4xl font-extrabold text-[#2B2B2B]">{score}</span>
              <span className="text-[10px] text-[#5B8C5A] font-semibold uppercase tracking-wider mt-1">
                {evalResult?.riskCategory?.toUpperCase()} RISK
              </span>
            </div>
          </div>

          <div className="text-center text-xs text-[#6B7280]">
            <p>Confidence Level: {evalResult?.confidenceScore * 100}%</p>
          </div>
        </div>

        <div className="md:col-span-2 p-8 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-6">
          <h2 className="text-sm font-semibold text-[#2B2B2B] border-b border-[#E5E7EB] pb-3">
            Weighted Strategic Category Breakdown
          </h2>

          <div className="space-y-5">
            {breakdownMetrics.map((item) => (
              <div key={item.name} className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-[#2B2B2B]">{item.name}</span>
                  <span className={`font-bold ${item.barColor}`}>{item.score} / 100</span>
                </div>
                <div className="h-2.5 w-full bg-[#F3F2EF] rounded-full overflow-hidden">
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

          <div className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] flex items-start space-x-3 text-xs text-[#6B7280]">
            <ShieldCheck className="text-[#8E9A7D] w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>
              Weighted Formula: (Authenticity × 0.35) + (Security × 0.25) + (Metadata × 0.20) + (Reputation × 0.20).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
