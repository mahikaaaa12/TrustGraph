import React, { useState } from 'react';
import { Shield, FileText, Globe, Lock, AlertTriangle, CheckCircle, ZoomIn, ZoomOut, RotateCcw, Activity } from 'lucide-react';

export default function TrustGraphVisualizer({ analysis }) {
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState(null);

  if (!analysis) return null;

  const score = analysis.trustScore || 85;
  const risk = analysis.riskCategory || 'low';
  const entity = analysis.targetEntity || 'Target Artifact';
  const abuseRing = analysis.abuseRingAnalysis || {};

  // Construct nodes & edges based on analysis entityType and abuse-ring data
  const hasRings = abuseRing.detected || abuseRing.cycleCount > 0;

  const nodes = hasRings
    ? [
        { id: 'root', label: `Ring Alert (${abuseRing.cycleCount} Cycles)`, type: 'ABUSE_RING', score: 25, risk: 'critical', x: 250, y: 40, details: 'Circular entity collusion ring detected.' },
        { id: 'acc_a', label: 'Entity A (Initiator)', type: 'USER', score: 30, risk: 'high', x: 120, y: 130, details: 'Account A - IP / Device Hub Initiator' },
        { id: 'acc_b', label: 'Entity B (Proxy)', type: 'USER', score: 35, risk: 'high', x: 380, y: 130, details: 'Account B - Rapid Velocity Pass-through' },
        { id: 'acc_c', label: 'Entity C (Drain)', type: 'USER', score: 20, risk: 'critical', x: 250, y: 220, details: 'Account C - Beneficiary destination' },
        { id: 'hub_ip', label: 'Shared Device Hub', type: 'DEVICE', score: 15, risk: 'critical', x: 250, y: 130, details: 'Shared Hardware Fingerprint linking all 3 accounts' },
      ]
    : [
        { id: 'root', label: `Root Evaluation: ${score}%`, type: 'Analysis', score, risk, x: 250, y: 40, details: `Overall Trust Index: ${score}/100 (${risk.toUpperCase()} risk profile).` },
        { id: 'entity', label: entity.substring(0, 20), type: analysis.entityType?.toUpperCase() || 'TARGET', score, risk, x: 250, y: 120, details: `Target Entity: ${entity} (Type: ${analysis.entityType}).` },
        { id: 'sec', label: 'Security & Encryption', type: 'Security', score: Math.min(100, score + 5), risk: score < 60 ? 'high' : 'low', x: 100, y: 210, details: 'Encryption parameters and PII leak detection check.' },
        { id: 'meta', label: 'Metadata Provenance', type: 'Metadata', score: Math.max(0, score - 5), risk: score < 50 ? 'medium' : 'low', x: 250, y: 210, details: 'EXIF camera tags, PDF producer, or DNS WHOIS age.' },
        { id: 'rep', label: 'Source Reputation', type: 'Reputation', score, risk, x: 400, y: 210, details: 'Threat blacklists and clickbait sensationalism index.' },
      ];

  const edges = hasRings
    ? [
        { from: 'root', to: 'hub_ip', label: 'collusion_root' },
        { from: 'acc_a', to: 'acc_b', label: 'transfer_loop' },
        { from: 'acc_b', to: 'acc_c', label: 'transfer_loop' },
        { from: 'acc_c', to: 'acc_a', label: 'circular_cycle' },
        { from: 'acc_a', to: 'hub_ip', label: 'shares_device' },
        { from: 'acc_b', to: 'hub_ip', label: 'shares_device' },
        { from: 'acc_c', to: 'hub_ip', label: 'shares_device' },
      ]
    : [
        { from: 'root', to: 'entity', label: 'evaluates' },
        { from: 'entity', to: 'sec', label: 'scans' },
        { from: 'entity', to: 'meta', label: 'parses' },
        { from: 'entity', to: 'rep', label: 'queries' },
      ];

  const getNodeColor = (nodeRisk) => {
    if (nodeRisk === 'critical' || nodeRisk === 'high') return '#D96C6C';
    if (nodeRisk === 'medium') return '#D9A441';
    return '#5B8C5A';
  };

  return (
    <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
        <div>
          <h3 className="text-sm font-bold text-[#2B2B2B] flex items-center space-x-2">
            <Shield className="w-4 h-4 text-[#8E9A7D]" />
            <span>Interactive Trust & Abuse-Ring Graph Topology</span>
          </h3>
          <p className="text-xs text-[#6B7280]">
            {hasRings ? '⚠️ Circular collusion cycle detected in entity relational topology' : 'Visual network topology connecting analysis root, target entity, and threat evidence'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
            className="p-1.5 rounded-lg bg-[#F8F7F4] hover:bg-[#F3F2EF] text-[#2B2B2B] border border-[#E5E7EB]"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))}
            className="p-1.5 rounded-lg bg-[#F8F7F4] hover:bg-[#F3F2EF] text-[#2B2B2B] border border-[#E5E7EB]"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setZoom(1); setSelectedNode(null); }}
            className="p-1.5 rounded-lg bg-[#F8F7F4] hover:bg-[#F3F2EF] text-[#2B2B2B] border border-[#E5E7EB]"
            title="Reset Graph"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SVG Visualizer Canvas */}
      <div className="relative overflow-hidden rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] h-72 flex items-center justify-center">
        <svg
          className="w-full h-full"
          viewBox="0 0 500 280"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.2s' }}
        >
          {/* Render Edges */}
          {edges.map((e, idx) => {
            const source = nodes.find((n) => n.id === e.from);
            const target = nodes.find((n) => n.id === e.to);
            if (!source || !target) return null;
            const isCycle = e.label.includes('cycle') || e.label.includes('loop');
            return (
              <g key={idx}>
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={isCycle ? '#D96C6C' : '#D1D5DB'}
                  strokeWidth={isCycle ? '2.5' : '1.5'}
                  strokeDasharray={isCycle ? 'none' : '4 4'}
                />
                <text
                  x={(source.x + target.x) / 2}
                  y={(source.y + target.y) / 2 - 5}
                  fill={isCycle ? '#D96C6C' : '#9CA3AF'}
                  fontSize="8"
                  fontWeight={isCycle ? 'bold' : 'normal'}
                  fontFamily="sans-serif"
                  textAnchor="middle"
                >
                  {e.label}
                </text>
              </g>
            );
          })}

          {/* Render Nodes */}
          {nodes.map((n) => {
            const isSelected = selectedNode?.id === n.id;
            const nodeColor = getNodeColor(n.risk);
            return (
              <g
                key={n.id}
                onClick={() => setSelectedNode(n)}
                className="cursor-pointer group"
              >
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={isSelected ? "22" : "18"}
                  fill="#FFFFFF"
                  stroke={nodeColor}
                  strokeWidth={isSelected ? "4" : "2.5"}
                  className="transition-all"
                />
                <circle
                  cx={n.x}
                  cy={n.y}
                  r="6"
                  fill={nodeColor}
                />
                <text
                  x={n.x}
                  y={n.y + 30}
                  fill="#2B2B2B"
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                  textAnchor="middle"
                >
                  {n.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Node Details Card */}
      {selectedNode && (
        <div className="p-3 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] text-xs space-y-1">
          <div className="flex justify-between items-center">
            <span className="font-bold text-[#2B2B2B]">{selectedNode.label} ({selectedNode.type})</span>
            <span className="text-[#5B8C5A] font-bold">Score: {selectedNode.score}%</span>
          </div>
          <p className="text-[#6B7280]">{selectedNode.details}</p>
        </div>
      )}
    </div>
  );
}
