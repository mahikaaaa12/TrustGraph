/**
 * Circuit Breaker & Resilient Fallback Utility
 * Protects runtime pipelines by preventing cascading failures and providing safe fallback paths.
 */
class CircuitBreaker {
  constructor(name = 'ML_INFERENCE', options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 3;
    this.recoveryTimeoutMs = options.recoveryTimeoutMs || 10000;
    this.failureCount = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.lastFailureTime = null;
  }

  /**
   * Executes target action with fallback on failure or when circuit is OPEN.
   */
  async execute(primaryFn, fallbackFn) {
    const now = Date.now();

    // Check if recovery timeout has elapsed to attempt recovery (HALF_OPEN)
    if (this.state === 'OPEN') {
      if (this.lastFailureTime && now - this.lastFailureTime > this.recoveryTimeoutMs) {
        this.state = 'HALF_OPEN';
      } else {
        return {
          ...fallbackFn(new Error(`Circuit breaker [${this.name}] is OPEN`)),
          isFallback: true,
          circuitState: 'OPEN',
        };
      }
    }

    try {
      const result = await primaryFn();

      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failureCount = 0;
      }

      return {
        ...result,
        isFallback: false,
        circuitState: this.state,
      };
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold) {
        this.state = 'OPEN';
      }

      const fallbackResult = fallbackFn(error);
      return {
        ...fallbackResult,
        isFallback: true,
        fallbackReason: error.message,
        circuitState: this.state,
      };
    }
  }
}

const defaultMlCircuitBreaker = new CircuitBreaker('ML_INFERENCE_PIPELINE', {
  failureThreshold: 3,
  recoveryTimeoutMs: 15000,
});

module.exports = {
  CircuitBreaker,
  defaultMlCircuitBreaker,
};
