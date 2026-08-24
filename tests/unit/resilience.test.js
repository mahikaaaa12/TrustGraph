const ResilienceService = require('../../src/services/resilience.service');
const { defaultMlCircuitBreaker } = require('../../src/utils/circuitBreaker');
const { defaultRiskAudit } = require('../../src/services/riskAudit.service');
const DecisionPipelineService = require('../../src/services/decisionPipeline.service');

describe('Resilience & Failure Simulator Unit Tests', () => {
  afterEach(() => {
    // Reset circuit breaker state after each test
    defaultMlCircuitBreaker.state = 'CLOSED';
    defaultMlCircuitBreaker.failureCount = 0;
  });

  describe('1. Model Failure & Fallback Resilience', () => {
    it('should engage deterministic fallback rules and output REVIEW without crashing', async () => {
      const simResult = await ResilienceService.simulateFailureScenario('model_unavailable', {
        transactionAmount: 150.0,
        transactionVelocity: 2,
        failedAttempts: 0,
      });

      expect(simResult.fallbackActive).toBe(true);
      expect(simResult.decision).toBe('REVIEW');
      expect(simResult.circuitBreakerState).toBe('OPEN');
      expect(simResult.auditLogged).toBe(true);
    });
  });

  describe('2. Database Offline Resilience', () => {
    it('should prevent data loss by operating in resilient in-memory mode when DB is unavailable', async () => {
      const dbResult = await ResilienceService.simulateFailureScenario('database_unavailable');

      expect(dbResult.dataLossPrevented).toBe(true);
      expect(dbResult.systemState).toContain('resilient');
    });
  });

  describe('3. External Threat Service Failure', () => {
    it('should timeout boundedly and NEVER fabricate a CLEAN result upon external failure', async () => {
      const extResult = await ResilienceService.simulateFailureScenario('external_api_timeout');

      expect(extResult.fallbackEngaged).toBe(true);
      expect(extResult.externalStatus).toBe('UNVERIFIED_SERVICE_TIMEOUT');
      expect(extResult.securityVerdict).toContain('UNVERIFIED');
      expect(extResult.securityVerdict).not.toBe('CLEAN');
    });
  });

  describe('4. LLM Service Failure', () => {
    it('should continue deterministic risk pipeline without making LLM mandatory', async () => {
      const llmResult = await ResilienceService.simulateFailureScenario('llm_timeout', {
        transactionAmount: 40.0,
        transactionVelocity: 1,
      });

      expect(llmResult.llmAnalysisSkipped).toBe(true);
      expect(llmResult.deterministicPipelineContinued).toBe(true);
      expect(llmResult.decision).toBe('ALLOW');
    });
  });

  describe('5. Malformed Request Sanitization', () => {
    it('should sanitize invalid strings, negative bounds, and corrupt telemetry without unhandled errors', async () => {
      const malformedResult = await ResilienceService.simulateFailureScenario('malformed_request');

      expect(malformedResult.sanitizedSuccessfully).toBe(true);
      expect(malformedResult.sanitizedAmountUSD).toBe(0.0);
      expect(['ALLOW', 'REVIEW', 'BLOCK']).toContain(malformedResult.decision);
    });
  });

  describe('6. Duplicate Events & Idempotency', () => {
    it('should record audit trail for event and identify duplicate replays', async () => {
      const dupResult = await ResilienceService.simulateFailureScenario('duplicate_event', {
        eventId: 'evt_test_unique_42',
        transactionAmount: 75.0,
      });

      expect(dupResult.idempotentAuditLogged).toBe(true);

      const logs = await defaultRiskAudit.getAuditLogs({ eventId: 'evt_test_unique_42' });
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].eventId).toBe('evt_test_unique_42');
      expect(logs[0]).toHaveProperty('policyVersion');
      expect(logs[0]).toHaveProperty('modelVersion');
    });
  });
});
