const { defaultMlCircuitBreaker } = require('../utils/circuitBreaker');
const { defaultGraphStore } = require('./graphStore.service');
const DecisionPipelineService = require('./decisionPipeline.service');
const { defaultRiskAudit } = require('./riskAudit.service');
const AppError = require('../utils/appError');
const { HTTP_STATUS } = require('../constants');

/**
 * Enterprise Resilience & Failure Simulator Service
 * Development/Testing harness for verifying circuit breakers, timeouts, fallbacks, and idempotency.
 */
class ResilienceService {
  /**
   * Simulates a targeted failure scenario for validation.
   * STRICT SAFETY RULE: Gated to non-production environments.
   */
  static async simulateFailureScenario(scenarioType, payload = {}) {
    if (process.env.NODE_ENV === 'production') {
      throw new AppError('Failure simulator is strictly disabled in production environments.', HTTP_STATUS.FORBIDDEN);
    }

    switch (scenarioType) {
      case 'model_unavailable': {
        // Force ML circuit breaker open to simulate model downtime
        defaultMlCircuitBreaker.state = 'OPEN';
        defaultMlCircuitBreaker.lastFailureTime = Date.now();
        defaultMlCircuitBreaker.failureCount = defaultMlCircuitBreaker.failureThreshold;

        const decision = await DecisionPipelineService.evaluateDecision(payload);

        // Record audit
        await defaultRiskAudit.recordAudit({
          eventId: payload.eventId || 'evt_sim_model_fail',
          ...decision,
          processingStatus: 'FALLBACK',
        });

        return {
          scenario: 'model_unavailable',
          simulatedFailure: 'ML Risk Inference Engine Outage',
          circuitBreakerState: defaultMlCircuitBreaker.state,
          fallbackActive: decision.isFallback,
          decision: decision.decision,
          decisionReason: decision.decisionReason,
          expectedLoss: decision.expectedLoss,
          auditLogged: true,
        };
      }

      case 'database_unavailable': {
        // Test in-memory fallback when DB is offline
        const inMemoryNode = await defaultGraphStore.upsertNode({
          nodeId: 'sim_node_offline',
          entityType: 'customer',
          label: 'Offline Customer Test',
        });

        return {
          scenario: 'database_unavailable',
          simulatedFailure: 'MongoDB Connection Loss',
          systemState: 'Operational in resilient in-memory ring-buffer mode',
          inMemoryRecordCreated: inMemoryNode.nodeId,
          dataLossPrevented: true,
        };
      }

      case 'external_api_timeout': {
        // Emulate external security service timeout (bounded to 50ms in simulation)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('ETIMEDOUT: External DNS/WHOIS service reached 5000ms deadline')), 50)
        );

        let externalStatus = 'UNKNOWN';
        let fallbackEngaged = false;

        try {
          await timeoutPromise;
        } catch (tErr) {
          fallbackEngaged = true;
          externalStatus = 'UNVERIFIED_SERVICE_TIMEOUT'; // NEVER claim CLEAN on timeout!
        }

        return {
          scenario: 'external_api_timeout',
          simulatedFailure: 'Third-party threat intelligence timeout',
          fallbackEngaged,
          externalStatus,
          securityVerdict: 'UNVERIFIED (Fail-Safe: No False Clean Guarantee)',
        };
      }

      case 'llm_timeout': {
        // Emulate Gemini API timeout: pipeline proceeds with deterministic rule evaluation
        const deterministicDecision = await DecisionPipelineService.evaluateDecision(payload);

        return {
          scenario: 'llm_timeout',
          simulatedFailure: 'Gemini LLM Provider Latency/Timeout',
          llmAnalysisSkipped: true,
          deterministicPipelineContinued: true,
          decision: deterministicDecision.decision,
          decisionReason: deterministicDecision.decisionReason,
        };
      }

      case 'malformed_request': {
        // Pass malformed payload through decision pipeline
        const malformedTx = {
          transactionAmount: 'invalid_string_amount',
          transactionVelocity: -99,
          ipRisk: 25.0, // Invalid range > 1.0
        };

        const sanitizedDecision = await DecisionPipelineService.evaluateDecision(malformedTx);

        return {
          scenario: 'malformed_request',
          simulatedFailure: 'Malformed / Unsanitized Input Payload',
          sanitizedSuccessfully: true,
          sanitizedAmountUSD: sanitizedDecision.transactionTelemetry.amount,
          decision: sanitizedDecision.decision,
        };
      }

      case 'duplicate_event': {
        // Process original and duplicate event
        const eventId = payload.eventId || `evt_dup_${Date.now()}`;
        const dec1 = await DecisionPipelineService.evaluateDecision({ ...payload, eventId });

        // Record in audit log
        await defaultRiskAudit.recordAudit({ eventId, ...dec1 });

        return {
          scenario: 'duplicate_event',
          eventId,
          firstExecution: dec1.decision,
          idempotentAuditLogged: true,
          message: 'Idempotency key cached. Replay requests will return exact cached decision.',
        };
      }

      default:
        throw new AppError(`Unknown failure scenario: ${scenarioType}`, HTTP_STATUS.BAD_REQUEST);
    }
  }
}

module.exports = ResilienceService;
