const GraphNode = require('../models/GraphNode');
const GraphEdge = require('../models/GraphEdge');
const { getDbState } = require('../config/db');

/**
 * High-Performance Graph Storage & Subgraph Traversal Service
 * Works seamlessly with MongoDB when connected, with in-memory fallback for local memory isolation.
 */
class GraphStoreService {
  constructor() {
    this.memoryNodes = new Map();
    this.memoryEdges = new Map();
  }

  isDbActive() {
    return getDbState() === 1;
  }

  /**
   * Upserts a graph vertex.
   */
  async upsertNode(nodeData) {
    const { nodeId, entityType, label, riskCategory = 'low', riskScore = 15, metadata = {} } = nodeData;

    if (this.isDbActive()) {
      return await GraphNode.findOneAndUpdate(
        { nodeId },
        { nodeId, entityType, label, riskCategory, riskScore, metadata },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    const node = { nodeId, entityType, label, riskCategory, riskScore, metadata, updatedAt: new Date() };
    this.memoryNodes.set(nodeId, node);
    return node;
  }

  /**
   * Upserts a directed/attributed graph edge.
   */
  async upsertEdge(edgeData) {
    const { source, target, relationship, weight = 1, metadata = {} } = edgeData;

    if (this.isDbActive()) {
      return await GraphEdge.findOneAndUpdate(
        { source, target, relationship },
        {
          $inc: { weight },
          $set: { lastSeen: new Date(), metadata },
          $setOnInsert: { firstSeen: new Date() },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    const edgeKey = `${source}:${target}:${relationship}`;
    const existing = this.memoryEdges.get(edgeKey);
    const edge = {
      source,
      target,
      relationship,
      weight: existing ? existing.weight + weight : weight,
      firstSeen: existing ? existing.firstSeen : new Date(),
      lastSeen: new Date(),
      metadata,
    };
    this.memoryEdges.set(edgeKey, edge);
    return edge;
  }

  /**
   * Ingests a complete transaction event into the relational graph.
   */
  async ingestTransaction(tx) {
    const {
      customerId,
      customerName = 'Customer',
      merchantId,
      merchantName = 'Merchant',
      transactionId,
      amount = 0,
      deviceId,
      ipAddress,
      email,
      paymentMethodId,
      riskScore = 15,
      riskCategory = 'low',
    } = tx;

    const nodesCreated = [];
    const edgesCreated = [];

    // 1. Transaction Node
    if (transactionId) {
      nodesCreated.push(
        await this.upsertNode({
          nodeId: transactionId,
          entityType: 'transaction',
          label: `TX: $${amount}`,
          riskScore,
          riskCategory,
          metadata: { amount, customerId, merchantId },
        })
      );
    }

    // 2. Customer Node
    if (customerId) {
      nodesCreated.push(
        await this.upsertNode({
          nodeId: customerId,
          entityType: 'customer',
          label: customerName || customerId,
          riskScore,
          riskCategory,
          metadata: { email, deviceId, ipAddress },
        })
      );

      if (transactionId) {
        edgesCreated.push(
          await this.upsertEdge({
            source: customerId,
            target: transactionId,
            relationship: 'EXECUTES_TRANSACTION',
          })
        );
      }
    }

    // 3. Merchant Node
    if (merchantId) {
      nodesCreated.push(
        await this.upsertNode({
          nodeId: merchantId,
          entityType: 'merchant',
          label: merchantName || merchantId,
          riskScore: 10,
          riskCategory: 'low',
        })
      );

      if (transactionId) {
        edgesCreated.push(
          await this.upsertEdge({
            source: transactionId,
            target: merchantId,
            relationship: 'MERCHANT_SETTLEMENT',
          })
        );
      }
    }

    // 4. Device Node
    if (deviceId && customerId) {
      nodesCreated.push(
        await this.upsertNode({
          nodeId: deviceId,
          entityType: 'device',
          label: `Device: ${deviceId.substring(0, 12)}`,
          riskScore,
          riskCategory,
        })
      );
      edgesCreated.push(
        await this.upsertEdge({
          source: customerId,
          target: deviceId,
          relationship: 'USES_DEVICE',
        })
      );
    }

    // 5. IP Address Node
    if (ipAddress && customerId) {
      nodesCreated.push(
        await this.upsertNode({
          nodeId: ipAddress,
          entityType: 'ip',
          label: `IP: ${ipAddress}`,
          riskScore,
          riskCategory,
        })
      );
      edgesCreated.push(
        await this.upsertEdge({
          source: customerId,
          target: ipAddress,
          relationship: 'USES_IP',
        })
      );
    }

    // 6. Email Node
    if (email && customerId) {
      nodesCreated.push(
        await this.upsertNode({
          nodeId: email,
          entityType: 'email',
          label: email,
          riskScore: 10,
          riskCategory: 'low',
        })
      );
      edgesCreated.push(
        await this.upsertEdge({
          source: customerId,
          target: email,
          relationship: 'ASSOCIATED_EMAIL',
        })
      );
    }

    // 7. Payment Method Node
    if (paymentMethodId && customerId) {
      nodesCreated.push(
        await this.upsertNode({
          nodeId: paymentMethodId,
          entityType: 'payment_method',
          label: `Card: ${paymentMethodId.substring(0, 10)}`,
          riskScore: 10,
          riskCategory: 'low',
        })
      );
      edgesCreated.push(
        await this.upsertEdge({
          source: customerId,
          target: paymentMethodId,
          relationship: 'USES_PAYMENT_METHOD',
        })
      );
    }

    return {
      nodesCount: nodesCreated.length,
      edgesCount: edgesCreated.length,
    };
  }

  /**
   * Traverses BFS neighborhood for an entity up to specified max hops.
   */
  async fetchNeighborhood(entityId, maxHops = 2, maxNodes = 60) {
    const visitedNodes = new Map();
    const collectedEdges = [];
    const queue = [{ id: entityId, hop: 0 }];

    while (queue.length > 0 && visitedNodes.size < maxNodes) {
      const { id, hop } = queue.shift();
      if (visitedNodes.has(id)) continue;

      // 1. Fetch Node
      let node = null;
      if (this.isDbActive()) {
        node = await GraphNode.findOne({ nodeId: id }).lean();
      } else {
        node = this.memoryNodes.get(id);
      }

      if (!node) {
        node = { nodeId: id, entityType: 'unknown', label: id, riskCategory: 'low', riskScore: 10 };
      }

      visitedNodes.set(id, node);

      if (hop >= maxHops) continue;

      // 2. Fetch connected Outgoing and Incoming Edges
      let edges = [];
      if (this.isDbActive()) {
        edges = await GraphEdge.find({
          $or: [{ source: id }, { target: id }],
        }).lean();
      } else {
        edges = Array.from(this.memoryEdges.values()).filter(
          (e) => e.source === id || e.target === id
        );
      }

      for (const e of edges) {
        collectedEdges.push(e);
        const neighborId = e.source === id ? e.target : e.source;
        if (!visitedNodes.has(neighborId)) {
          queue.push({ id: neighborId, hop: hop + 1 });
        }
      }
    }

    // Deduplicate edges
    const uniqueEdgesMap = new Map();
    for (const e of collectedEdges) {
      const k = `${e.source}_${e.target}_${e.relationship}`;
      if (!uniqueEdgesMap.has(k)) {
        uniqueEdgesMap.set(k, e);
      }
    }

    return {
      rootEntityId: entityId,
      nodes: Array.from(visitedNodes.values()),
      edges: Array.from(uniqueEdgesMap.values()),
    };
  }

  /**
   * Seeds a rich synthetic demo graph representing legitimate and Sybil collusion clusters.
   */
  async seedSyntheticAbuseRingDemo() {
    // Cluster 1: Sybil Abuse Ring (Accounts A, B, C sharing Device X & IP Y with Circular Transfer Loop)
    const sybilTxs = [
      {
        transactionId: 'tx_sybil_01',
        customerId: 'cust_sybil_alice',
        customerName: 'Alice Sybil (Account 1)',
        merchantId: 'merch_crypto_exchange',
        merchantName: 'FastPay Crypto Gateway',
        amount: 850.0,
        deviceId: 'dev_bot_hub_99',
        ipAddress: '198.51.100.77',
        email: 'alice.sybil@disposable-mail.org',
        paymentMethodId: 'pm_card_9901',
        riskScore: 78,
        riskCategory: 'critical',
      },
      {
        transactionId: 'tx_sybil_02',
        customerId: 'cust_sybil_bob',
        customerName: 'Bob Sybil (Account 2)',
        merchantId: 'merch_crypto_exchange',
        merchantName: 'FastPay Crypto Gateway',
        amount: 920.0,
        deviceId: 'dev_bot_hub_99', // Shared Device Hub
        ipAddress: '198.51.100.77', // Shared IP Hub
        email: 'bob.sybil@disposable-mail.org',
        paymentMethodId: 'pm_card_9902',
        riskScore: 75,
        riskCategory: 'high',
      },
      {
        transactionId: 'tx_sybil_03',
        customerId: 'cust_sybil_charlie',
        customerName: 'Charlie Sybil (Account 3)',
        merchantId: 'merch_crypto_exchange',
        merchantName: 'FastPay Crypto Gateway',
        amount: 1100.0,
        deviceId: 'dev_bot_hub_99', // Shared Device Hub
        ipAddress: '198.51.100.77', // Shared IP Hub
        email: 'charlie.sybil@disposable-mail.org',
        paymentMethodId: 'pm_card_9903',
        riskScore: 82,
        riskCategory: 'critical',
      },
    ];

    for (const tx of sybilTxs) {
      await this.ingestTransaction(tx);
    }

    // Circular Transfer Edges (Alice -> Bob -> Charlie -> Alice)
    await this.upsertEdge({ source: 'cust_sybil_alice', target: 'cust_sybil_bob', relationship: 'TRANSFERS_TO', weight: 3 });
    await this.upsertEdge({ source: 'cust_sybil_bob', target: 'cust_sybil_charlie', relationship: 'TRANSFERS_TO', weight: 2 });
    await this.upsertEdge({ source: 'cust_sybil_charlie', target: 'cust_sybil_alice', relationship: 'TRANSFERS_TO', weight: 4 });

    // Cluster 2: Legitimate Customer Network
    const legitTx = {
      transactionId: 'tx_legit_101',
      customerId: 'cust_legit_sarah',
      customerName: 'Sarah Jenkins (Verified)',
      merchantId: 'merch_retail_shop',
      merchantName: 'Organic Goods Store',
      amount: 64.50,
      deviceId: 'dev_iphone_sarah_14',
      ipAddress: '203.0.113.15',
      email: 'sarah.jenkins@gmail.com',
      paymentMethodId: 'pm_visa_4242',
      riskScore: 8,
      riskCategory: 'low',
    };
    await this.ingestTransaction(legitTx);

    return {
      message: 'Synthetic multi-entity abuse ring demo graph seeded successfully.',
      entities: ['cust_sybil_alice', 'cust_sybil_bob', 'cust_sybil_charlie', 'cust_legit_sarah'],
      clustersSeeded: 2,
    };
  }
}

const defaultGraphStore = new GraphStoreService();

module.exports = {
  GraphStoreService,
  defaultGraphStore,
};
