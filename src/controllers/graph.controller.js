const { defaultGraphStore } = require('../services/graphStore.service');
const GraphEngineService = require('../services/graphEngine.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const { HTTP_STATUS } = require('../constants');

/**
 * Controller for Graph Abuse Ring Investigation & Topology Queries
 */

exports.investigateEntity = asyncHandler(async (req, res) => {
  const { entityId } = req.params;
  const maxHops = Math.min(3, Math.max(1, Number(req.query.depth) || 2));

  if (!entityId || !entityId.trim()) {
    throw new AppError('Entity ID is required for graph investigation.', HTTP_STATUS.BAD_REQUEST);
  }

  // 1. Fetch Subgraph neighborhood
  const subgraph = await defaultGraphStore.fetchNeighborhood(entityId, maxHops);

  // 2. Compute Graph Signals, Risk Score & Human Explanations
  const graphAnalysis = GraphEngineService.analyzeEntityGraph(entityId, subgraph);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: `Graph investigation completed for entity ${entityId}.`,
    data: {
      entityId,
      graphRiskScore: graphAnalysis.graphRiskScore,
      graphRiskLevel: graphAnalysis.graphRiskLevel,
      features: graphAnalysis.features,
      sharedDevices: graphAnalysis.sharedDevices,
      sharedIps: graphAnalysis.sharedIps,
      relatedAccounts: graphAnalysis.relatedAccounts,
      suspiciousConnections: graphAnalysis.suspiciousConnections,
      cycles: graphAnalysis.cycles,
      topGraphSignals: graphAnalysis.topGraphSignals,
      explanations: graphAnalysis.humanReadableExplanations,
      topology: {
        nodes: subgraph.nodes,
        edges: subgraph.edges,
      },
    },
  });
});

exports.ingestTransaction = asyncHandler(async (req, res) => {
  const txData = req.body;
  if (!txData.transactionId || (!txData.customerId && !txData.merchantId)) {
    throw new AppError('transactionId and at least customerId or merchantId are required.', HTTP_STATUS.BAD_REQUEST);
  }

  const result = await defaultGraphStore.ingestTransaction(txData);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Transaction ingested into relational graph.',
    data: result,
  });
});

exports.seedDemoGraph = asyncHandler(async (req, res) => {
  const result = await defaultGraphStore.seedSyntheticAbuseRingDemo();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Synthetic multi-entity abuse-ring demo graph seeded.',
    data: result,
  });
});
