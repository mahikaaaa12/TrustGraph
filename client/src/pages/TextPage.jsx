import React, { useState } from 'react';
import api from '../services/api';
import { useErrorLogs } from '../context/ErrorLogContext';
import { FaFont, FaSearch, FaRobot, FaSmile, FaExclamationTriangle, FaChartBar } from 'react-icons/fa';

export default function TextPage() {
  const { showToast } = useErrorLogs();
  const [text, setText] = useState('');
  const [benchmarkText, setBenchmarkText] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

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

      setAnalysisResult(res.data?.data);
      showToast('Text authenticity & NLP analysis completed!', 'success');
    } catch (err) {
      showToast(err.message || 'Text analysis failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Text Authenticity & Sentiment Analyzer</h1>
        <p className="text-sm text-slate-400 mt-1">
          Evaluate text streams for AI generation probability (perplexity/burstiness), sentiment, fake news risk, and cosine vector similarity.
        </p>
      </div>

      {/* Input Form */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <form onSubmit={handleAnalyze} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400">Target Text Content</label>
            <textarea
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste article, paragraph, or statement text to analyze..."
              className="w-full mt-1.5 bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400">
              Optional Benchmark Text (For Cosine Similarity Comparison)
            </label>
            <textarea
              rows={2}
              value={benchmarkText}
              onChange={(e) => setBenchmarkText(e.target.value)}
              placeholder="Paste reference text passage to compare similarity against..."
              className="w-full mt-1.5 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-medium rounded-xl text-sm transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20"
          >
            <FaSearch />
            <span>{loading ? 'Analyzing NLP & Perplexity Metrics...' : 'Run Text Analysis Engine'}</span>
          </button>
        </form>
      </div>

      {/* Analysis Output */}
      {analysisResult && (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400">Overall Trust Score</span>
              <p className="text-xl font-bold text-emerald-400 mt-1">
                {analysisResult.overallTrustScore} / 100
              </p>
            </div>
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400">AI Generated Risk</span>
              <p className="text-xl font-bold text-rose-400 mt-1 flex items-center space-x-1">
                <FaRobot className="text-lg" />
                <span>{(analysisResult.aiDetection?.aiProbability * 100).toFixed(0)}%</span>
              </p>
            </div>
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400">Sentiment Score</span>
              <p className="text-sm font-bold text-blue-400 capitalize mt-1 flex items-center space-x-1">
                <FaSmile />
                <span>{analysisResult.sentiment?.sentiment} ({analysisResult.sentiment?.compoundScore})</span>
              </p>
            </div>
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400">Fake News Risk</span>
              <p className="text-sm font-bold text-amber-400 mt-1">
                {(analysisResult.fakeNewsDetection?.fakeNewsProbability * 100).toFixed(0)}% Risk
              </p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AI Perplexity Details */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <h3 className="text-sm font-semibold text-white border-b border-slate-800 pb-3">
                AI Perplexity & Burstiness Telemetry
              </h3>
              <pre className="p-3 bg-slate-950 rounded-xl text-xs font-mono text-blue-300 border border-slate-800 overflow-x-auto">
                {JSON.stringify(analysisResult.aiDetection, null, 2)}
              </pre>
            </div>

            {/* Fake News & Similarity Details */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <h3 className="text-sm font-semibold text-white border-b border-slate-800 pb-3">
                Sensationalism & Cosine Similarity
              </h3>
              <pre className="p-3 bg-slate-950 rounded-xl text-xs font-mono text-amber-300 border border-slate-800 overflow-x-auto">
                {JSON.stringify(
                  {
                    fakeNewsDetection: analysisResult.fakeNewsDetection,
                    cosineSimilarityScore: analysisResult.similarityScore,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
