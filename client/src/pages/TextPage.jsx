import React, { useState } from 'react';
import api from '../services/api';
import { useErrorLogs } from '../context/ErrorLogContext';
import {
  Type,
  Search,
  Cpu,
  Smile,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  ShieldAlert,
  FileCheck,
} from 'lucide-react';

export default function TextPage() {
  const { showToast } = useErrorLogs();
  const [text, setText] = useState('');
  const [benchmarkText, setBenchmarkText] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!text || text.trim().length === 0) {
      showToast('Please enter text content to analyze.', 'error');
      return;
    }

    setLoading(true);
    setAnalysisResult(null);

    try {
      const res = await api.post('/text/analyze', {
        text,
        ...(benchmarkText.trim() && { benchmarkText }),
      });

      const resultData = res.data?.data || res.data?.analysis || res.data;
      setAnalysisResult(resultData);
      showToast('Text authenticity & NLP analysis completed!', 'success');
    } catch (err) {
      const errMsg = err?.message || err?.data?.message || 'Text analysis failed.';
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const aiAssessment = analysisResult?.aiGenerationAssessment || {};
  const socialEngAss = analysisResult?.socialEngineeringAssessment || {};
  const sent = analysisResult?.sentiment || {};
  const fakeNews = analysisResult?.fakeNewsDetection || {};
  const riskAssessment = analysisResult?.riskAssessment || {};
  const signalsList = Array.isArray(analysisResult?.signals) ? analysisResult.signals : [];

  const score = analysisResult?.overallTrustScore ?? analysisResult?.trustScore ?? 85;
  const riskLevel = (riskAssessment.riskLevel || analysisResult?.riskCategory || 'LOW').toUpperCase();
  const aiLikelihood = Math.round((aiAssessment.likelihood || 0.05) * 100);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#2B2B2B] tracking-tight">Text Authenticity & Social Engineering Scanner</h1>
        <p className="text-xs text-[#6B7280] mt-1">
          Evaluate text content for AI-generation likelihood (burstiness & entropy heuristics), social engineering threats, sentiment, and clickbait patterns.
        </p>
      </div>

      <div className="p-8 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-4">
        <form onSubmit={handleAnalyze} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#6B7280]">Target Text Content</label>
            <textarea
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste article, email, or message text to analyze..."
              className="w-full mt-1.5 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl p-3.5 text-xs text-[#2B2B2B] focus:outline-none focus:border-[#8E9A7D] font-mono"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#6B7280]">
              Optional Benchmark Text (For Cosine Vector Similarity Comparison)
            </label>
            <textarea
              rows={2}
              value={benchmarkText}
              onChange={(e) => setBenchmarkText(e.target.value)}
              placeholder="Paste reference text passage to compare similarity against..."
              className="w-full mt-1.5 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl p-3 text-xs text-[#2B2B2B] focus:outline-none focus:border-[#8E9A7D] font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="w-full py-3.5 bg-[#8E9A7D] hover:bg-[#7F8F73] disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF] text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center space-x-2 shadow-xs"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 stroke-[1.75]" />}
            <span>{loading ? 'Analyzing Perplexity & Burstiness...' : 'Run Text Analysis Engine'}</span>
          </button>
        </form>
      </div>

      {analysisResult && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs">
              <span className="text-xs text-[#6B7280]">Overall Trust Score</span>
              <p className="text-2xl font-black text-[#5B8C5A] mt-1">{score} / 100</p>
            </div>
            <div className="p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs">
              <span className="text-xs text-[#6B7280]">AI-Generation Likelihood</span>
              <p className="text-2xl font-black text-[#D96C6C] mt-1 flex items-center space-x-1">
                <Cpu className="w-5 h-5 stroke-[1.75]" />
                <span>{aiLikelihood}%</span>
              </p>
            </div>
            <div className="p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs">
              <span className="text-xs text-[#6B7280]">Social Engineering Risk</span>
              <p className="text-sm font-bold text-[#7F8F73] uppercase mt-1">{socialEngAss.classification || 'LOW'}</p>
            </div>
            <div className="p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs">
              <span className="text-xs text-[#6B7280]">Risk Assessment</span>
              <p className="text-xs font-bold text-[#D9A441] uppercase mt-1">{riskLevel} RISK</p>
            </div>
          </div>

          {/* AUTHENTICITY ASSESSMENT CARD */}
          <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7EB] pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-[#8E9A7D]/15 text-[#7F8F73]">
                  <Cpu className="w-5 h-5 stroke-[1.75]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2B2B2B]">TEXT AUTHENTICITY ASSESSMENT</h3>
                  <p className="text-xs text-[#6B7280]">Perplexity entropy, sentence burstiness variance, and explicit self-disclosures</p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-[#D96C6C]/15 text-[#D96C6C] font-mono text-xs font-bold uppercase border border-[#D96C6C]/30">
                CLASSIFICATION: {aiAssessment.classification || 'LOW'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1">
                <span className="text-[#9CA3AF]">AI Likelihood</span>
                <p className="text-2xl font-black text-[#D96C6C]">{aiLikelihood}%</p>
              </div>
              <div className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1">
                <span className="text-[#9CA3AF]">Burstiness Variance</span>
                <p className="text-2xl font-bold text-[#7F8F73]">{aiAssessment.burstinessScore ?? 65.0}</p>
              </div>
              <div className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1">
                <span className="text-[#9CA3AF]">Sentiment</span>
                <p className="text-xs font-bold text-[#2B2B2B] capitalize pt-1">{sent.sentiment || 'neutral'} ({sent.compoundScore ?? 0})</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#2B2B2B] uppercase tracking-wider">Detected Signals & Evidence</h4>
              <div className="space-y-2 text-xs">
                {signalsList.map((sig, idx) => (
                  <div key={idx} className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] flex items-start space-x-2.5">
                    <CheckCircle className="w-4 h-4 text-[#8E9A7D] flex-shrink-0 mt-0.5" />
                    <span className="text-[#6B7280]">{typeof sig === 'string' ? sig : sig.description}</span>
                  </div>
                ))}
                {signalsList.length === 0 && (
                  <p className="text-xs text-[#5B8C5A] p-3 bg-[#F8F7F4] rounded-xl">✓ Text exhibits natural human structural complexity.</p>
                )}
              </div>
            </div>

            <div className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] flex items-start space-x-3 text-xs text-[#6B7280]">
              <Info className="w-5 h-5 text-[#8E9A7D] flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#2B2B2B]">DETECTION ≠ DANGER:</strong>
                <p className="mt-0.5">AI-generated text or formal business prose is not inherently malicious. Verify factual accuracy before relying on this text for high-impact decisions.</p>
              </div>
            </div>
          </div>

          {/* SECURITY RISK ASSESSMENT CARD */}
          <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs space-y-6">
            <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-[#5B8C5A]/15 text-[#5B8C5A]">
                  <ShieldAlert className="w-5 h-5 stroke-[1.75]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2B2B2B]">TEXT SECURITY RISK ASSESSMENT</h3>
                  <p className="text-xs text-[#6B7280]">Independent security evaluation based on social engineering threats & credential harvesting</p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-[#5B8C5A]/15 text-[#5B8C5A] border border-[#5B8C5A]/30">
                {riskLevel} RISK LEVEL
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#2B2B2B] uppercase tracking-wider">Risk Factors & Evaluation Reasons</h4>
                {riskAssessment.reasons?.map((reason, idx) => (
                  <div key={idx} className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] flex items-start space-x-2.5">
                    <AlertTriangle className="w-4 h-4 text-[#D9A441] flex-shrink-0 mt-0.5" />
                    <span className="text-[#6B7280]">{reason}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#2B2B2B] uppercase tracking-wider">Recommendations</h4>
                {riskAssessment.recommendations?.map((rec, idx) => (
                  <div key={idx} className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] flex items-start space-x-2.5">
                    <CheckCircle className="w-4 h-4 text-[#5B8C5A] flex-shrink-0 mt-0.5" />
                    <span className="text-[#6B7280]">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Technical JSON Collapsible */}
          <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs space-y-4">
            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className="w-full flex items-center justify-between text-xs font-bold text-[#2B2B2B] hover:text-[#7F8F73] transition-colors"
            >
              <span>Technical Data / Raw JSON</span>
              {showRawJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showRawJson && (
              <pre className="p-4 bg-[#F8F7F4] rounded-xl text-xs font-mono text-[#7F8F73] border border-[#E5E7EB] overflow-x-auto max-h-96">
                {JSON.stringify(analysisResult, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
