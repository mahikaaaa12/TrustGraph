const { GraphStoreService } = require('../../src/services/graphStore.service');

describe('GraphStoreService Unit Tests', () => {
  let graphStore;

  beforeEach(() => {
    graphStore = new GraphStoreService();
  });

  it('should store and retrieve graph nodes and relationships in memory when DB disconnected', async () => {
    const node = await graphStore.upsertNode({
      nodeId: 'cust_101',
      entityType: 'customer',
      label: 'Alice',
      riskScore: 20,
    });

    expect(node.nodeId).toBe('cust_101');
    expect(node.entityType).toBe('customer');

    const edge = await graphStore.upsertEdge({
      source: 'cust_101',
      target: 'dev_99',
      relationship: 'USES_DEVICE',
      weight: 1,
    });

    expect(edge.source).toBe('cust_101');
    expect(edge.relationship).toBe('USES_DEVICE');
  });

  it('should ingest a full multi-entity transaction into the relational graph', async () => {
    const tx = {
      transactionId: 'tx_5001',
      customerId: 'cust_bob',
      customerName: 'Bob',
      merchantId: 'merch_tech_store',
      merchantName: 'Tech Store',
      amount: 150.0,
      deviceId: 'dev_laptop_bob',
      ipAddress: '198.51.100.22',
      email: 'bob@example.com',
      paymentMethodId: 'pm_card_5555',
    };

    const result = await graphStore.ingestTransaction(tx);
    expect(result.nodesCount).toBe(7);
    expect(result.edgesCount).toBe(6);

    const neighborhood = await graphStore.fetchNeighborhood('cust_bob', 2);
    expect(neighborhood.nodes.length).toBeGreaterThanOrEqual(6);
    expect(neighborhood.edges.length).toBeGreaterThanOrEqual(5);
  });

  it('should seed synthetic abuse-ring fixtures cleanly with circular loops', async () => {
    const seedResult = await graphStore.seedSyntheticAbuseRingDemo();
    expect(seedResult.clustersSeeded).toBe(2);

    const aliceNeighborhood = await graphStore.fetchNeighborhood('cust_sybil_alice', 2);
    const nodeIds = aliceNeighborhood.nodes.map((n) => n.nodeId);

    expect(nodeIds).toContain('cust_sybil_alice');
    expect(nodeIds).toContain('dev_bot_hub_99');
    expect(nodeIds).toContain('198.51.100.77');
  });
});
