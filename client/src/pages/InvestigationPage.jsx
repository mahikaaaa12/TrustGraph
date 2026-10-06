import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useErrorLogs } from '../context/ErrorLogContext';
import { motion } from 'framer-motion';
import AnalysisLoader from '../components/common/AnalysisLoader';
import {
  Share2,
  Search,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  Shield,
  Layers,
  Cpu,
  RotateCcw,
  Sparkles,
  Zap,
  Users,
  Smartphone,
  Globe,
  DollarSign,
  ArrowRight,
} from 'lucide-react';

export default function InvestigationPage() {
  const { showToast } = useErrorLogs();
  const [searchEntity, setSearchEntity] = useState('cust_sybil_alice');
  const [loading, setLoading] = useState(false);
  const [investigationData, setInvestigationData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  const fetchInvestigation = async (entityId) => {
    const targetId = entityId || searchEntity;
    if (!targetId || !targetId.trim()) return;

    setLoading(true);
    try {
      const res = await api.get(`/graph/investigate/${encodeURIComponent(targetId.trim())}?depth=2`);
      if (res.data?.success) {
        setInvestigationData(res.data.data);
        showToast(`Graph investigation completed for ${targetId}!`, 'success');
      }
    } catch (err) {
      showToast(err.message || 'Investigation query failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDemo = async () => {
    setLoading(true);
    try {
      const res = await api.post('/graph/seed-demo');
      if (res.data?.success) {
        showToast('Synthetic abuse-ring demo graph seeded successfully!', 'success');
        fetchInvestigation('cust_sybil_alice');
      }
    } catch (err) {
      showToast('Failed to seed demo graph.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Seed initial demo graph and investigate Alice on mount
    handleSeedDemo();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchInvestigation(searchEntity);
  };

  const features = investigationData?.features || {};
  const explanations = investigationData?.explanations || [];
  const signals = investigationData?.topGraphSignals || [];
  const topology = investigationData?.topology || { nodes: [], edges: [] };
  const graphRisk = investigationData?.graphRiskScore || 0;
  const graphLevel = investigationData?.graphRiskLevel || 'LOW';

  // Compute clean positioned SVG topology for visualizer
  const nodes = topology.nodes || [];
  const edges = topology.edges || [];

  // Group nodes by entityType to create clean tiered hierarchical visualizer
  const entityNodes = nodes.filter((n) => n.entityType === 'customer' || n.entityType === 'user');
  const deviceNodes = nodes.filter((n) => n.entityType === 'device');
  const ipNodes = nodes.filter((n) => n.entityType === 'ip');
  const txNodes = nodes.filter((n) => n.entityType === 'transaction');
  const merchantNodes = nodes.filter((n) => n.entityType === 'merchant');
  const otherNodes = nodes.filter(
    (n) => !['customer', 'user', 'device', 'ip', 'transaction', 'merchant'].includes(n.entityType)
  );

  const positionedNodes = [];
  const placeRow = (nodeList, yPos, startX, stepX) => {
    nodeList.forEach((n, idx) => {
      const x = startX + idx * stepX;
      positionedNodes.push({
        ...n,
        id: n.nodeId || n.id,
        x,
        y: yPos,
      });
    });
  };

  placeRow(entityNodes, 60, 100, 150);
  placeRow(deviceNodes, 140, 80, 160);
  placeRow(ipNodes, 140, 320, 160);
  placeRow(txNodes, 220, 100, 150);
  placeRow(merchantNodes, 220, 320, 150);
  placeRow(otherNodes, 140, 200, 120);

  const getNodeColor = (node) => {
    if (node.riskCategory === 'critical' || node.riskScore >= 75) return '#D96C6C';
    if (node.riskCategory === 'high' || node.riskScore >= 50) return '#D9A441';
    if (node.nodeId === investigationData?.entityId) return '#8E9A7D';
    return '#5B8C5A';
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header & Quick Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2B2B2B] tracking-tight">Graph Abuse Ring & Collusion Inspector</h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Topological investigation of multi-account collusion, shared device hubs, IP farms, and circular transfer rings.
          </p>
        </div>

        <button
          onClick={handleSeedDemo}
          className="px-4 py-2 bg-[#F8F7F4] hover:bg-[#8E9A7D] hover:text-white border border-[#E5E7EB] rounded-xl text-xs font-semibold transition-all flex items-center space-x-2"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Re-Seed Synthetic Abuse Ring</span>
        </button>
      </div>

      {/* Search & Cluster Selector */}
      <div className="p-6 bg-white rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] w-4 h-4 stroke-[1.5]" />
            <input
              type="text"
              value={searchEntity}
              onChange={(e) => setSearchEntity(e.target.value)}
              placeholder="Search Entity ID (e.g. cust_sybil_alice, dev_bot_hub_99)..."
              className="w-full pl-11 pr-4 py-3 bg-[#F8F7F4] border border-[#E5E7EB] rounded-xl text-xs font-mono text-[#2B2B2B] focus:outline-none focus:border-[#8E9A7D]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-[#8E9A7D] hover:bg-[#7F8F73] disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center space-x-2"
          >
            <Share2 className="w-4 h-4" />
            <span>{loading ? 'Traversing Graph...' : 'Investigate Subgraph'}</span>
          </button>
        </form>

        {/* Quick Demo Pre-selected Entities */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E5E7EB] text-xs">
          <span className="text-[#9CA3AF] font-semibold flex items-center pr-2">Quick Entities:</span>
          {[
            { id: 'cust_sybil_alice', label: 'Alice (Collusion Ring Lead)', type: 'alert' },
            { id: 'cust_sybil_bob', label: 'Bob (Sybil Node 2)', type: 'alert' },
            { id: 'dev_bot_hub_99', label: 'Shared Device Hub 99', type: 'hub' },
            { id: 'cust_legit_sarah', label: 'Sarah Jenkins (Clean Entity)', type: 'clean' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => { setSearchEntity(item.id); fetchInvestigation(item.id); }}
              className={`px-3 py-1 rounded-lg border text-xs transition-colors flex items-center space-x-1.5 ${
                searchEntity === item.id
                  ? 'bg-[#8E9A7D] text-white border-[#8E9A7D] font-bold'
                  : 'bg-[#F8F7F4] border-[#E5E7EB] text-[#6B7280] hover:text-[#2B2B2B]'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${item.type === 'alert' ? 'bg-[#D96C6C]' : item.type === 'hub' ? 'bg-[#D9A441]' : 'bg-[#5B8C5A]'}`} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <AnalysisLoader
          message="Traversing Graph Abuse Ring & Subgraph..."
          subMessage="Analyzing multi-entity topological relationships, shared hardware hubs, and circular transfers..."
        />
      )}

      {!loading && (
        <>
          {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase">Graph Risk Score</span>
          <p className="text-3xl font-black text-[#D96C6C]">{graphRisk} / 100</p>
          <span className={`text-[10px] font-bold uppercase ${graphLevel === 'CRITICAL' ? 'text-[#D96C6C]' : graphLevel === 'HIGH' ? 'text-[#D9A441]' : 'text-[#5B8C5A]'}`}>
            {graphLevel} TOPOLOGICAL RISK
          </span>
        </div>

        <div className="p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase">Shared Device Accounts</span>
          <p className="text-3xl font-black text-[#2B2B2B]">{features.sharedDeviceCount || 0}</p>
          <span className="text-[10px] text-[#6B7280]">Linked via hardware ID</span>
        </div>

        <div className="p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase">Shared IP Accounts</span>
          <p className="text-3xl font-black text-[#2B2B2B]">{features.sharedIpCount || 0}</p>
          <span className="text-[10px] text-[#6B7280]">Linked via subnet IP</span>
        </div>

        <div className="p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase">Cluster Size</span>
          <p className="text-3xl font-black text-[#7F8F73]">{features.clusterSize || 1}</p>
          <span className="text-[10px] text-[#6B7280]">Connected component nodes</span>
        </div>
      </div>

      {/* Visualizer & Explanations Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive SVG Network Graph (2 Columns) */}
        <div className="lg:col-span-2 p-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#2B2B2B] flex items-center space-x-2">
                <Share2 className="w-4 h-4 text-[#8E9A7D]" />
                <span>Multi-Entity Topological Network</span>
              </h3>
              <p className="text-xs text-[#6B7280]">Customer ↔ Device ↔ IP ↔ Transaction ↔ Merchant Relational Map</p>
            </div>
            <span className="text-xs font-mono text-[#6B7280]">{nodes.length} Nodes, {edges.length} Edges</span>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] h-80 flex items-center justify-center">
            <svg className="w-full h-full" viewBox="0 0 600 300">
              {/* Edges */}
              {edges.map((e, idx) => {
                const s = positionedNodes.find((n) => n.id === e.source) || { x: 150, y: 100 };
                const t = positionedNodes.find((n) => n.id === e.target) || { x: 350, y: 150 };
                const isCycle = e.relationship === 'TRANSFERS_TO' || e.relationship?.includes('TRANSFER');
                return (
                  <g key={idx}>
                    <line
                      x1={s.x}
                      y1={s.y}
                      x2={t.x}
                      y2={t.y}
                      stroke={isCycle ? '#D96C6C' : '#CBD5E1'}
                      strokeWidth={isCycle ? '2.5' : '1.5'}
                      strokeDasharray={isCycle ? 'none' : '3 3'}
                    />
                    <text
                      x={(s.x + t.x) / 2}
                      y={(s.y + t.y) / 2 - 4}
                      fill={isCycle ? '#D96C6C' : '#94A3B8'}
                      fontSize="7"
                      fontWeight={isCycle ? 'bold' : 'normal'}
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {e.relationship}
                    </text>
                  </g>
                );
              })}

              {/* Nodes */}
              {positionedNodes.map((n) => {
                const isTarget = n.id === investigationData?.entityId;
                const isSelected = selectedNode?.nodeId === n.id || selectedNode?.id === n.id;
                const color = getNodeColor(n);
                return (
                  <g
                    key={n.id}
                    onClick={() => setSelectedNode(n)}
                    className="cursor-pointer group"
                  >
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={isTarget ? "22" : isSelected ? "18" : "15"}
                      fill="#FFFFFF"
                      stroke={color}
                      strokeWidth={isTarget || isSelected ? "3.5" : "2"}
                    />
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r="5"
                      fill={color}
                    />
                    <text
                      x={n.x}
                      y={n.y + 26}
                      fill="#2B2B2B"
                      fontSize="8"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                      textAnchor="middle"
                    >
                      {n.label?.substring(0, 16) || n.id}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {selectedNode && (
            <div className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] text-xs font-mono flex justify-between items-center">
              <div>
                <strong className="text-[#2B2B2B]">{selectedNode.label || selectedNode.nodeId}</strong>
                <span className="text-[#6B7280] block text-[11px]">Type: {selectedNode.entityType} | ID: {selectedNode.nodeId || selectedNode.id}</span>
              </div>
              <span className="text-[#D96C6C] font-bold">Risk Score: {selectedNode.riskScore || 15}%</span>
            </div>
          )}
        </div>

        {/* Human-Readable Explanations Panel */}
        <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#2B2B2B] border-b border-[#E5E7EB] pb-3 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#8E9A7D]" />
              <span>Evidence & Forensic Attribution</span>
            </h3>

            <div className="space-y-2.5">
              {explanations.map((exp, idx) => (
                <div key={idx} className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] text-xs space-y-1">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-[#D9A441] flex-shrink-0 mt-0.5" />
                    <span className="text-[#2B2B2B] font-medium leading-relaxed">{exp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Connected Entities Summary */}
          <div className="p-3.5 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-2 text-xs font-mono">
            <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">Related Farm Entities:</span>
            <div className="flex flex-wrap gap-1">
              {investigationData?.relatedAccounts?.map((acc, idx) => (
                <button
                  key={idx}
                  onClick={() => { setSearchEntity(acc); fetchInvestigation(acc); }}
                  className="px-2 py-0.5 bg-white border border-[#E5E7EB] rounded text-[10px] hover:border-[#8E9A7D]"
                >
                  {acc}
                </button>
              ))}
              {(!investigationData?.relatedAccounts || investigationData.relatedAccounts.length === 0) && (
                <span className="text-[#6B7280] text-[11px]">Zero related accounts detected</span>
              )}
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
