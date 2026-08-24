const GraphAnalysisService = require('./graphAnalysis.service');

/**
 * Advanced Graph Feature & Abuse-Ring Risk Evaluation Engine
 */
class GraphEngineService {
  /**
   * Evaluates deep topological risk and extracts graph signals for a target entity within a subgraph.
   */
  static analyzeEntityGraph(entityId, subgraph = { nodes: [], edges: [] }) {
    const nodes = subgraph.nodes || [];
    const edges = subgraph.edges || [];

    // 1. Build Multi-modal Adjacency
    const { adj, directedAdj } = GraphAnalysisService.buildAdjacencyList(
      nodes.map((n) => ({ id: n.nodeId || n.id, type: n.entityType || n.type })),
      edges.map((e) => ({ source: e.source, target: e.target, type: e.relationship || e.type, weight: e.weight || 1 }))
    );

    // 2. Compute Connected Components & Cycle Detection
    const components = GraphAnalysisService.findConnectedComponents(
      nodes.map((n) => ({ id: n.nodeId || n.id })),
      adj
    );
    const cycles = GraphAnalysisService.detectDirectedCycles(
      nodes.map((n) => ({ id: n.nodeId || n.id })),
      directedAdj
    );

    // Find the component containing the target entity
    const targetComponent = components.find((c) => c.includes(entityId)) || [entityId];
    const clusterSize = targetComponent.length;

    // 3. Extract Specific Relational Graph Features for Entity
    const entityNeighbors = adj.get(entityId) || [];
    const nodeDegree = entityNeighbors.length;

    // Find shared devices and IPs connected to entity
    const directDevices = entityNeighbors
      .filter((n) => n.type === 'USES_DEVICE' || String(n.target).startsWith('dev_'))
      .map((n) => n.target);

    const directIps = entityNeighbors
      .filter((n) => n.type === 'USES_IP' || String(n.target).startsWith('ip_') || /^\d+\.\d+\.\d+\.\d+$/.test(n.target))
      .map((n) => n.target);

    // Accounts sharing device
    const sharedDeviceAccounts = new Set();
    for (const devId of directDevices) {
      const devNeighbors = adj.get(devId) || [];
      for (const dn of devNeighbors) {
        if (dn.target !== entityId) {
          sharedDeviceAccounts.add(dn.target);
        }
      }
    }

    // Accounts sharing IP
    const sharedIpAccounts = new Set();
    for (const ipId of directIps) {
      const ipNeighbors = adj.get(ipId) || [];
      for (const inb of ipNeighbors) {
        if (inb.target !== entityId) {
          sharedIpAccounts.add(inb.target);
        }
      }
    }

    // Connected Merchants
    const connectedMerchants = new Set();
    for (const n of entityNeighbors) {
      if (n.type === 'EXECUTES_TRANSACTION' || String(n.target).startsWith('tx_')) {
        const txNeighbors = adj.get(n.target) || [];
        for (const txn of txNeighbors) {
          if (txn.type === 'MERCHANT_SETTLEMENT' || String(txn.target).startsWith('merch_')) {
            connectedMerchants.add(txn.target);
          }
        }
      }
    }

    // Suspicious Neighbors (High / Critical risk)
    const suspiciousNeighbors = [];
    for (const n of entityNeighbors) {
      const neighborNode = nodes.find((node) => (node.nodeId || node.id) === n.target);
      if (neighborNode && (neighborNode.riskCategory === 'high' || neighborNode.riskCategory === 'critical' || (neighborNode.riskScore || 0) >= 60)) {
        suspiciousNeighbors.push({
          nodeId: neighborNode.nodeId || neighborNode.id,
          entityType: neighborNode.entityType,
          riskCategory: neighborNode.riskCategory,
          riskScore: neighborNode.riskScore,
          relationship: n.type,
        });
      }
    }

    // Check if target entity participates in a circular cycle
    const entityCycles = cycles.filter((c) => c.includes(entityId));
    const isCyclicCollusion = entityCycles.length > 0;

    // 4. Graph Risk Scoring & Thresholds
    let graphRiskScore = 10;
    const topGraphSignals = [];
    const humanReadableExplanations = [];

    // Factor 1: Shared Device Farm
    if (sharedDeviceAccounts.size > 0) {
      const deviceRisk = Math.min(40, sharedDeviceAccounts.size * 15);
      graphRiskScore += deviceRisk;
      topGraphSignals.push({
        signal: 'SHARED_DEVICE_CLUSTER',
        severity: sharedDeviceAccounts.size >= 3 ? 'CRITICAL' : 'HIGH',
        count: sharedDeviceAccounts.size,
        points: deviceRisk,
      });
      humanReadableExplanations.push(
        `${sharedDeviceAccounts.size} other account(s) are associated with the same physical hardware device.`
      );
    }

    // Factor 2: Shared IP Subnet
    if (sharedIpAccounts.size > 0) {
      const ipRisk = Math.min(30, sharedIpAccounts.size * 10);
      graphRiskScore += ipRisk;
      topGraphSignals.push({
        signal: 'SHARED_IP_CLUSTER',
        severity: sharedIpAccounts.size >= 4 ? 'HIGH' : 'MEDIUM',
        count: sharedIpAccounts.size,
        points: ipRisk,
      });
      humanReadableExplanations.push(
        `${sharedIpAccounts.size} account(s) share the same IP network address.`
      );
    }

    // Factor 3: Circular Money Flow / Referral Cycle
    if (isCyclicCollusion) {
      graphRiskScore += 35;
      topGraphSignals.push({
        signal: 'CIRCULAR_COLLUSION_CYCLE',
        severity: 'CRITICAL',
        cycleCount: entityCycles.length,
        points: 35,
      });
      humanReadableExplanations.push(
        `Circular fund transfer cycle detected across ${entityCycles[0].length - 1} linked entities (${entityCycles[0].join(' → ')}).`
      );
    }

    // Factor 4: Suspicious Direct Neighbors
    if (suspiciousNeighbors.length > 0) {
      const neighborRisk = Math.min(25, suspiciousNeighbors.length * 8);
      graphRiskScore += neighborRisk;
      topGraphSignals.push({
        signal: 'SUSPICIOUS_NEIGHBORHOOD',
        severity: 'HIGH',
        count: suspiciousNeighbors.length,
        points: neighborRisk,
      });
      humanReadableExplanations.push(
        `${suspiciousNeighbors.length} directly linked neighbor entity/entities were previously flagged as elevated or critical risk.`
      );
    }

    // Factor 5: Large Dense Component
    if (clusterSize >= 5) {
      graphRiskScore += 10;
      topGraphSignals.push({
        signal: 'DENSE_NETWORK_COMPONENT',
        severity: 'MEDIUM',
        clusterSize,
        points: 10,
      });
      humanReadableExplanations.push(
        `Entity is part of a dense connected component consisting of ${clusterSize} relational nodes.`
      );
    }

    // Normalize Graph Risk Bound [0, 100]
    graphRiskScore = Math.min(100, Math.max(0, graphRiskScore));

    let graphRiskLevel = 'LOW';
    if (graphRiskScore >= 75) graphRiskLevel = 'CRITICAL';
    else if (graphRiskScore >= 50) graphRiskLevel = 'HIGH';
    else if (graphRiskScore >= 25) graphRiskLevel = 'MEDIUM';

    if (humanReadableExplanations.length === 0) {
      humanReadableExplanations.push('Entity relational graph exhibits normal isolated topology with zero shared device or IP clusters.');
    }

    const centrality = nodes.length > 1 ? parseFloat((nodeDegree / (nodes.length - 1)).toFixed(4)) : 0.0;

    return {
      entityId,
      graphRiskScore,
      graphRiskLevel,
      features: {
        sharedDeviceCount: sharedDeviceAccounts.size,
        sharedIpCount: sharedIpAccounts.size,
        connectedMerchantsCount: connectedMerchants.size,
        nodeDegree,
        clusterSize,
        graphCentrality: centrality,
        suspiciousNeighborCount: suspiciousNeighbors.length,
        isCyclicCollusion,
        cycleCount: entityCycles.length,
      },
      sharedDevices: directDevices,
      sharedIps: directIps,
      relatedAccounts: Array.from(new Set([...sharedDeviceAccounts, ...sharedIpAccounts])),
      suspiciousConnections: suspiciousNeighbors,
      cycles: entityCycles,
      topGraphSignals,
      humanReadableExplanations,
      explanations: humanReadableExplanations,
    };
  }
}

module.exports = GraphEngineService;
