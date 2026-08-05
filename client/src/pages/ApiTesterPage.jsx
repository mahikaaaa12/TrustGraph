import React, { useState } from 'react';
import api from '../services/api';
import { Play, Clock, CheckCircle, AlertTriangle, Terminal } from 'lucide-react';

const endpointsList = [
  {
    id: 'health',
    name: 'Health Check Telemetry',
    method: 'GET',
    url: '/health',
    headers: {},
    defaultBody: '',
  },
  {
    id: 'signup',
    name: 'User Signup',
    method: 'POST',
    url: '/auth/signup',
    headers: { 'Content-Type': 'application/json' },
    defaultBody: JSON.stringify({ name: 'Dev Tester', email: `test_${Date.now()}@trustgraph.ai`, password: 'Password123!', role: 'user' }, null, 2),
  },
  {
    id: 'login',
    name: 'User Login',
    method: 'POST',
    url: '/auth/login',
    headers: { 'Content-Type': 'application/json' },
    defaultBody: JSON.stringify({ email: 'sarah@cyberdyne.org', password: 'Password123!' }, null, 2),
  },
  {
    id: 'getMe',
    name: 'Get Session User (req.user)',
    method: 'GET',
    url: '/auth/me',
    headers: {},
    defaultBody: '',
  },
  {
    id: 'analyzeDoc',
    name: 'Analyze Document',
    method: 'POST',
    url: '/documents/analyze',
    headers: { 'Content-Type': 'application/json' },
    defaultBody: JSON.stringify({ fileId: '66b0ef21c8e2a149f8a31e12' }, null, 2),
  },
  {
    id: 'analyzeImg',
    name: 'Analyze Image Forensics',
    method: 'POST',
    url: '/images/analyze',
    headers: { 'Content-Type': 'application/json' },
    defaultBody: JSON.stringify({ fileId: '66b0f124c8e2a149f8a31e55' }, null, 2),
  },
  {
    id: 'analyzeWeb',
    name: 'Analyze Website Security',
    method: 'POST',
    url: '/websites/analyze',
    headers: { 'Content-Type': 'application/json' },
    defaultBody: JSON.stringify({ url: 'https://google.com' }, null, 2),
  },
];

export default function ApiTesterPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState(endpointsList[0]);
  const [requestBody, setRequestBody] = useState(selectedEndpoint.defaultBody);
  const [loading, setLoading] = useState(false);
  const [responseResult, setResponseResult] = useState(null);

  const handleSelectEndpoint = (ep) => {
    setSelectedEndpoint(ep);
    setRequestBody(ep.defaultBody);
    setResponseResult(null);
  };

  const handleExecuteRequest = async () => {
    setLoading(true);
    setResponseResult(null);
    const startTime = performance.now();

    try {
      let res;
      if (selectedEndpoint.method === 'GET') {
        res = await api.get(selectedEndpoint.url);
      } else {
        const parsedBody = requestBody ? JSON.parse(requestBody) : {};
        res = await api.post(selectedEndpoint.url, parsedBody);
      }

      const duration = Math.round(performance.now() - startTime);

      setResponseResult({
        status: res.status,
        statusText: res.statusText || 'OK',
        durationMs: duration,
        headers: res.headers,
        data: res.data,
      });
    } catch (err) {
      const duration = Math.round(performance.now() - startTime);
      setResponseResult({
        status: err.status || 500,
        statusText: 'Error',
        durationMs: duration,
        error: err.message || 'Request failed',
        data: err.data || { error: err.message },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#2B2B2B] tracking-tight">Interactive API Endpoint Tester</h1>
        <p className="text-xs text-[#6B7280] mt-1">
          Manually trigger backend REST endpoints, inspect request headers, status codes, and latency payload responses.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Endpoint Selector Column */}
        <div className="p-5 bg-white border border-[#E5E7EB] rounded-2xl space-y-3 shadow-xs">
          <h2 className="text-xs font-semibold text-[#2B2B2B] border-b border-[#E5E7EB] pb-3">
            Registered API Endpoints
          </h2>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {endpointsList.map((ep) => (
              <button
                key={ep.id}
                onClick={() => handleSelectEndpoint(ep)}
                className={`w-full text-left p-3 rounded-xl border transition-all text-xs flex items-center justify-between ${
                  selectedEndpoint.id === ep.id
                    ? 'bg-[#8E9A7D]/15 border-[#8E9A7D] text-[#2B2B2B] font-semibold'
                    : 'bg-[#F8F7F4] border-[#E5E7EB] text-[#6B7280] hover:text-[#2B2B2B]'
                }`}
              >
                <div className="space-y-1">
                  <span className="font-semibold block">{ep.name}</span>
                  <p className="font-mono text-[10px] text-[#9CA3AF]">{ep.url}</p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                    ep.method === 'GET'
                      ? 'bg-[#5B8C5A]/15 text-[#5B8C5A] border border-[#5B8C5A]/20'
                      : 'bg-[#8E9A7D]/15 text-[#7F8F73] border border-[#8E9A7D]/20'
                  }`}
                >
                  {ep.method}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Execution & Response Column */}
        <div className="md:col-span-2 space-y-6">
          {/* Request Config Card */}
          <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
              <div className="flex items-center space-x-3">
                <span
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                    selectedEndpoint.method === 'GET'
                      ? 'bg-[#5B8C5A]/15 text-[#5B8C5A] border border-[#5B8C5A]/20'
                      : 'bg-[#8E9A7D]/15 text-[#7F8F73] border border-[#8E9A7D]/20'
                  }`}
                >
                  {selectedEndpoint.method}
                </span>
                <code className="text-xs font-mono font-bold text-[#2B2B2B]">{selectedEndpoint.url}</code>
              </div>
              <button
                onClick={handleExecuteRequest}
                disabled={loading}
                className="px-5 py-2.5 bg-[#8E9A7D] hover:bg-[#7F8F73] text-white text-xs font-semibold rounded-xl transition-colors flex items-center space-x-2 shadow-xs"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{loading ? 'Sending...' : 'Send Request'}</span>
              </button>
            </div>

            {selectedEndpoint.method !== 'GET' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#6B7280]">Request Body (JSON)</label>
                <textarea
                  rows={6}
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  className="w-full bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl p-3 text-xs font-mono text-[#2B2B2B] focus:outline-none focus:border-[#8E9A7D]"
                />
              </div>
            )}
          </div>

          {/* Response Payload Viewer */}
          {responseResult && (
            <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                      responseResult.status < 400
                        ? 'bg-[#5B8C5A]/15 text-[#5B8C5A] border border-[#5B8C5A]/20'
                        : 'bg-[#D96C6C]/15 text-[#D96C6C] border border-[#D96C6C]/20'
                    }`}
                  >
                    Status: {responseResult.status} {responseResult.statusText}
                  </span>
                </div>
                <div className="flex items-center space-x-1 text-xs text-[#9CA3AF] font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{responseResult.durationMs} ms</span>
                </div>
              </div>

              <pre className="p-4 bg-[#F8F7F4] rounded-xl text-xs font-mono text-[#7F8F73] border border-[#E5E7EB] overflow-x-auto max-h-96">
                {JSON.stringify(responseResult.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
