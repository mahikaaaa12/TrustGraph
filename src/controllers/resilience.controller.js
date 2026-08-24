const ResilienceService = require('../services/resilience.service');
const { defaultRiskAudit } = require('../services/riskAudit.service');
const asyncHandler = require('../utils/asyncHandler');
const { HTTP_STATUS } = require('../constants');

exports.simulateFailure = asyncHandler(async (req, res) => {
  const { scenarioType = 'model_unavailable', payload = {} } = req.body;
  const result = await ResilienceService.simulateFailureScenario(scenarioType, payload);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: `Resilience scenario '${scenarioType}' executed successfully.`,
    data: result,
  });
});

exports.getAuditLogs = asyncHandler(async (req, res) => {
  const { eventId, limit = 50, offset = 0 } = req.query;
  const logs = await defaultRiskAudit.getAuditLogs({
    eventId,
    limit: Number(limit),
    offset: Number(offset),
  });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Risk audit trail retrieved.',
    data: {
      count: logs.length,
      logs,
    },
  });
});
