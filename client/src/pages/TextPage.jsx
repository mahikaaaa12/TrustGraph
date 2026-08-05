import React, { useState } from 'react';
import api from '../services/api';
import { useErrorLogs } from '../context/ErrorLogContext';
import { Type, Search, Cpu, Smile, AlertTriangle } from 'lucide-react';

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
        <h1 className="text-2xl font-bold text-[#2B2B2B] tracking-tight">Text Authenticity & Sentiment Analyzer</h1>
        <p className="text-xs text-[#6B7280] mt-1">
          Evaluate text streams for AI generation probability (perplexity/burstiness), sentiment, fake news risk, and cosine vector similarity.
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
              placeholder="Paste article, paragraph, or statement text to analyze..."
              className="w-full mt-1.5 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl p-3.5 text-xs text-[#2B2B2B] focus:outline-none focus:border-[#8E9A7D] font-mono"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#6B7280]">
              Optional Benchmark Text (For Cosine Similarity Comparison)
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
            <Search className="w-4 h-4 stroke-[1.75]" />
            <span>{loading ? 'Analyzing NLP & Perplexity Metrics...' : 'Run Text Analysis Engine'}</span>
          </button>
        </form>
      </div>

      {analysisResult && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs">
              <span className="text-xs text-[#6B7280]">Overall Trust Score</span>
              <p className="text-2xl font-black text-[#5B8C5A] mt-1">
                {analysisResult.overallTrustScore} / 100
              </p>
            </div>
            <div className="p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs">
              <span className="text-xs text-[#6B7280]">AI Generated Risk</span>
              <p className="text-2xl font-black text-[#D96C6C] mt-1 flex items-center space-x-1">
                <Cpu className="w-5 h-5 stroke-[1.75]" />
                <span>{(analysisResult.aiDetection?.aiProbability * 100).toFixed(0)}%</span>
              </p>
            </div>
            <div className="p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs">
              <span className="text-xs text-[#6B7280]">Sentiment Score</span>
              <p className="text-sm font-bold text-[#7F8F73] capitalize mt-1 flex items-center space-x-1">
                <Smile className="w-4 h-4" />
                <span>{analysisResult.sentiment?.sentiment} ({analysisResult.sentiment?.compoundScore})</span>
              </p>
            </div>
            <div className="p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs">
              <span className="text-xs text-[#6B7280]">Fake News Risk</span>
              <p className="text-sm font-bold text-[#D9A441] mt-1">
                {(analysisResult.fakeNewsDetection?.fakeNewsProbability * 100).toFixed(0)}% Risk
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl space-y-3 shadow-xs">
              <h3 className="text-sm font-semibold text-[#2B2B2B] border-b border-[#E5E7EB] pb-3">
                AI Perplexity & Burstiness Telemetry
              </h3>
              <pre className="p-3 bg-[#F8F7F4] rounded-xl text-xs font-mono text-[#7F8F73] border border-[#E5E7EB] overflow-x-auto">
                {JSON.stringify(analysisResult.aiDetection, null, 2)}
              </pre>
            </div>

            <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl space-y-3 shadow-xs">
              <h3 className="text-sm font-semibold text-[#2B2B2B] border-b border-[#E5E7EB] pb-3">
                Sensationalism & Cosine Similarity
              </h3>
              <pre className="p-3 bg-[#F8F7F4] rounded-xl text-xs font-mono text-[#D9A441] border border-[#E5E7EB] overflow-x-auto">
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
