const GraphAnalysisService = require('../../src/services/graphAnalysis.service');

describe('GraphAnalysisService Unit Tests', () => {
  it('should detect circular collusion cycles (A -> B -> C -> A)', () => {
    const cyclicGraph = {
      nodes: [
        { id: 'acc_A', label: 'Account A', type: 'user' },
        { id: 'acc_B', label: 'Account B', type: 'user' },
        { id: 'acc_C', label: 'Account C', type: 'user' },
      ],
      edges: [
        { source: 'acc_A', target: 'acc_B', type: 'TRANSFER' },
        { source: 'acc_B', target: 'acc_C', type: 'TRANSFER' },
        { source: 'acc_C', target: 'acc_A', type: 'TRANSFER' },
      ],
    };

    const result = GraphAnalysisService.analyzeAbuseRings(cyclicGraph);

    expect(result.detected).toBe(true);
    expect(result.cycleCount).toBeGreaterThan(0);
    expect(result.ringRiskScore).toBeGreaterThanOrEqual(40);
    expect(['HIGH', 'CRITICAL', 'MEDIUM']).toContain(result.classification);
  });

  it('should identify high-degree shared-attribute hubs', () => {
    const hubGraph = {
      nodes: [
        { id: 'shared_ip', label: '198.51.100.4', type: 'ip' },
        { id: 'user_1', label: 'User 1', type: 'user' },
        { id: 'user_2', label: 'User 2', type: 'user' },
        { id: 'user_3', label: 'User 3', type: 'user' },
        { id: 'user_4', label: 'User 4', type: 'user' },
      ],
      edges: [
        { source: 'user_1', target: 'shared_ip', type: 'USES_IP' },
        { source: 'user_2', target: 'shared_ip', type: 'USES_IP' },
        { source: 'user_3', target: 'shared_ip', type: 'USES_IP' },
        { source: 'user_4', target: 'shared_ip', type: 'USES_IP' },
      ],
    };

    const result = GraphAnalysisService.analyzeAbuseRings(hubGraph);

    expect(result.hubs.length).toBeGreaterThan(0);
    expect(result.hubs[0].nodeId).toBe('shared_ip');
    expect(result.hubs[0].degree).toBe(4);
  });

  it('should return clean status for empty or disjoint small networks', () => {
    const cleanGraph = {
      nodes: [
        { id: 'user_1', label: 'User 1', type: 'user' },
        { id: 'doc_1', label: 'Doc 1', type: 'document' },
      ],
      edges: [{ source: 'user_1', target: 'doc_1', type: 'UPLOADS' }],
    };

    const result = GraphAnalysisService.analyzeAbuseRings(cleanGraph);

    expect(result.detected).toBe(false);
    expect(result.cycleCount).toBe(0);
    expect(result.hubs.length).toBe(0);
  });
});
