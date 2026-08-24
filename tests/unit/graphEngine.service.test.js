const GraphEngineService = require('../../src/services/graphEngine.service');

describe('GraphEngineService Unit Tests', () => {
  it('should detect shared device farms and calculate elevated graph risk', () => {
    const subgraph = {
      nodes: [
        { id: 'cust_alice', type: 'customer', riskScore: 70 },
        { id: 'cust_bob', type: 'customer', riskScore: 65 },
        { id: 'cust_charlie', type: 'customer', riskScore: 80 },
        { id: 'dev_shared_hub', type: 'device', riskScore: 85 },
      ],
      edges: [
        { source: 'cust_alice', target: 'dev_shared_hub', type: 'USES_DEVICE' },
        { source: 'cust_bob', target: 'dev_shared_hub', type: 'USES_DEVICE' },
        { source: 'cust_charlie', target: 'dev_shared_hub', type: 'USES_DEVICE' },
      ],
    };

    const analysis = GraphEngineService.analyzeEntityGraph('cust_alice', subgraph);

    expect(analysis.graphRiskScore).toBeGreaterThanOrEqual(40);
    expect(['HIGH', 'CRITICAL', 'MEDIUM']).toContain(analysis.graphRiskLevel);
    expect(analysis.features.sharedDeviceCount).toBe(2); // Bob and Charlie share the device with Alice
    expect(analysis.explanations.some((e) => e.includes('associated with the same physical hardware device'))).toBe(true);
  });

  it('should detect circular money transfer cycles (A -> B -> C -> A) and explain the loop', () => {
    const cyclicSubgraph = {
      nodes: [
        { id: 'cust_A', type: 'customer', riskScore: 70 },
        { id: 'cust_B', type: 'customer', riskScore: 70 },
        { id: 'cust_C', type: 'customer', riskScore: 70 },
      ],
      edges: [
        { source: 'cust_A', target: 'cust_B', type: 'TRANSFERS_TO' },
        { source: 'cust_B', target: 'cust_C', type: 'TRANSFERS_TO' },
        { source: 'cust_C', target: 'cust_A', type: 'TRANSFERS_TO' },
      ],
    };

    const analysis = GraphEngineService.analyzeEntityGraph('cust_A', cyclicSubgraph);

    expect(analysis.features.isCyclicCollusion).toBe(true);
    expect(analysis.cycles.length).toBeGreaterThan(0);
    expect(analysis.explanations.some((e) => e.includes('Circular fund transfer cycle detected'))).toBe(true);
  });

  it('should return low topological risk for isolated clean customer entity', () => {
    const cleanSubgraph = {
      nodes: [
        { id: 'cust_clean', type: 'customer', riskScore: 10 },
        { id: 'dev_unique', type: 'device', riskScore: 10 },
        { id: 'ip_clean', type: 'ip', riskScore: 10 },
      ],
      edges: [
        { source: 'cust_clean', target: 'dev_unique', type: 'USES_DEVICE' },
        { source: 'cust_clean', target: 'ip_clean', type: 'USES_IP' },
      ],
    };

    const analysis = GraphEngineService.analyzeEntityGraph('cust_clean', cleanSubgraph);

    expect(analysis.graphRiskScore).toBeLessThanOrEqual(25);
    expect(analysis.graphRiskLevel).toBe('LOW');
    expect(analysis.features.sharedDeviceCount).toBe(0);
    expect(analysis.features.sharedIpCount).toBe(0);
  });

  it('should handle missing entities or empty subgraphs gracefully', () => {
    const emptyAnalysis = GraphEngineService.analyzeEntityGraph('cust_non_existent', { nodes: [], edges: [] });

    expect(emptyAnalysis.graphRiskScore).toBeLessThanOrEqual(20);
    expect(emptyAnalysis.graphRiskLevel).toBe('LOW');
    expect(emptyAnalysis.features.clusterSize).toBe(1);
    expect(emptyAnalysis.explanations.length).toBeGreaterThan(0);
  });
});
