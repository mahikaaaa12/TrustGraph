/**
 * Graph-Based Abuse-Ring & Collusion Detection Service
 * Analyzes entity relation graphs using Connected Components, Cycle Detection, and Hub Centrality.
 */
class GraphAnalysisService {
  /**
   * Builds an adjacency list representation from nodes and edges.
   */
  static buildAdjacencyList(nodes = [], edges = []) {
    const adj = new Map();
    const directedAdj = new Map();

    for (const node of nodes) {
      adj.set(node.id, []);
      directedAdj.set(node.id, []);
    }

    for (const edge of edges) {
      if (!adj.has(edge.source)) adj.set(edge.source, []);
      if (!adj.has(edge.target)) adj.set(edge.target, []);
      if (!directedAdj.has(edge.source)) directedAdj.set(edge.source, []);
      if (!directedAdj.has(edge.target)) directedAdj.set(edge.target, []);

      adj.get(edge.source).push({ target: edge.target, type: edge.type, weight: edge.weight || 1 });
      adj.get(edge.target).push({ target: edge.source, type: edge.type, weight: edge.weight || 1 }); // Undirected

      directedAdj.get(edge.source).push({ target: edge.target, type: edge.type, weight: edge.weight || 1 });
    }

    return { adj, directedAdj };
  }

  /**
   * Finds all Connected Components (Subgraphs) in the entity network using BFS.
   */
  static findConnectedComponents(nodes = [], adj) {
    const visited = new Set();
    const components = [];

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        const component = [];
        const queue = [node.id];
        visited.add(node.id);

        while (queue.length > 0) {
          const curr = queue.shift();
          component.push(curr);

          const neighbors = adj.get(curr) || [];
          for (const neighbor of neighbors) {
            if (!visited.has(neighbor.target)) {
              visited.add(neighbor.target);
              queue.push(neighbor.target);
            }
          }
        }

        components.push(component);
      }
    }

    return components;
  }

  /**
   * Detects Directed Cycles (e.g. A -> B -> C -> A circular fund movement) using DFS with color states.
   * State 0: Unvisited, State 1: Visiting (in current recursion stack), State 2: Visited
   */
  static detectDirectedCycles(nodes = [], directedAdj) {
    const state = new Map();
    const parent = new Map();
    const cycles = [];

    for (const node of nodes) {
      state.set(node.id, 0);
    }

    const dfs = (u, currentPath) => {
      state.set(u, 1);
      currentPath.push(u);

      const neighbors = directedAdj.get(u) || [];
      for (const edge of neighbors) {
        const v = edge.target;
        if (state.get(v) === 1) {
          // Cycle detected: extract cycle path from currentPath
          const cycleStartIndex = currentPath.indexOf(v);
          const cycle = currentPath.slice(cycleStartIndex).concat([v]);
          cycles.push(cycle);
        } else if (state.get(v) === 0) {
          parent.set(v, u);
          dfs(v, currentPath);
        }
      }

      currentPath.pop();
      state.set(u, 2);
    };

    for (const node of nodes) {
      if (state.get(node.id) === 0) {
        dfs(node.id, []);
      }
    }

    return cycles;
  }

  /**
   * Computes degree centrality and identifies shared-attribute hubs (Sybil farm indicators).
   */
  static identifyHighDegreeHubs(nodes = [], adj, thresholdDegree = 3) {
    const hubs = [];

    for (const node of nodes) {
      const neighbors = adj.get(node.id) || [];
      const degree = neighbors.length;

      if (degree >= thresholdDegree) {
        hubs.push({
          nodeId: node.id,
          nodeType: node.type,
          degree,
          connectedEntities: neighbors.map((n) => n.target),
        });
      }
    }

    return hubs;
  }

  /**
   * Master Abuse-Ring and Collusion Analyzer
   * @param {Object} graphData - { nodes: [{ id, label, type, risk }], edges: [{ source, target, type, weight }] }
   * @returns {Object} Comprehensive ring topology analysis with risk multiplier
   */
  static analyzeAbuseRings(graphData = {}) {
    const nodes = Array.isArray(graphData.nodes) ? graphData.nodes : [];
    const edges = Array.isArray(graphData.edges) ? graphData.edges : [];

    if (nodes.length === 0) {
      return {
        detected: false,
        ringRiskScore: 0,
        ringCount: 0,
        cycles: [],
        hubs: [],
        connectedComponents: [],
        explanation: 'No entity network nodes provided for topological analysis.',
      };
    }

    const { adj, directedAdj } = this.buildAdjacencyList(nodes, edges);
    const components = this.findConnectedComponents(nodes, adj);
    const cycles = this.detectDirectedCycles(nodes, directedAdj);
    const hubs = this.identifyHighDegreeHubs(nodes, adj);

    // Calculate Abuse Ring Risk Score
    let ringRiskScore = 0;
    const signals = [];

    if (cycles.length > 0) {
      ringRiskScore += 45;
      signals.push({
        type: 'circular_collusion_cycle',
        severity: 'critical',
        description: `Detected ${cycles.length} circular entity relation cycle(s) (potential money routing / referral fraud).`,
        cycles,
      });
    }

    if (hubs.length > 0) {
      const totalHubConnections = hubs.reduce((acc, h) => acc + h.degree, 0);
      const hubPenalty = Math.min(40, totalHubConnections * 8);
      ringRiskScore += hubPenalty;
      signals.push({
        type: 'shared_attribute_hub',
        severity: 'high',
        description: `Detected ${hubs.length} high-density shared entity hub(s) linking multiple independent accounts.`,
        hubs,
      });
    }

    // High density / large component penalty
    const maxComponentSize = Math.max(...components.map((c) => c.length), 0);
    if (maxComponentSize >= 4) {
      ringRiskScore += 15;
      signals.push({
        type: 'dense_collusion_cluster',
        severity: 'medium',
        description: `Largest linked entity component contains ${maxComponentSize} connected entities.`,
      });
    }

    ringRiskScore = Math.min(100, ringRiskScore);
    const detected = ringRiskScore >= 40;

    let classification = 'LOW';
    if (ringRiskScore >= 75) classification = 'CRITICAL';
    else if (ringRiskScore >= 50) classification = 'HIGH';
    else if (ringRiskScore >= 25) classification = 'MEDIUM';

    return {
      detected,
      classification,
      ringRiskScore,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      componentCount: components.length,
      cycleCount: cycles.length,
      cycles,
      hubs,
      signals,
      explanation: detected
        ? `High abuse-ring risk detected (${classification}): Network exhibits ${cycles.length} cycles and ${hubs.length} shared entity hubs.`
        : 'Entity topology exhibits healthy decentralized distribution with zero circular collusion cycles.',
    };
  }
}

module.exports = GraphAnalysisService;
