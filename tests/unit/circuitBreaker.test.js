const { CircuitBreaker } = require('../../src/utils/circuitBreaker');

describe('CircuitBreaker Unit Tests', () => {
  it('should execute primary function successfully when healthy', async () => {
    const cb = new CircuitBreaker('TEST_BREAKER', { failureThreshold: 2 });
    const result = await cb.execute(
      () => Promise.resolve({ data: 'ok' }),
      () => ({ data: 'fallback' })
    );

    expect(result.data).toBe('ok');
    expect(result.isFallback).toBe(false);
    expect(result.circuitState).toBe('CLOSED');
  });

  it('should trigger fallback and trip to OPEN after threshold failures', async () => {
    const cb = new CircuitBreaker('TEST_BREAKER', { failureThreshold: 2, recoveryTimeoutMs: 1000 });

    // Failure 1
    const res1 = await cb.execute(
      () => { throw new Error('Primary failure 1'); },
      (err) => ({ data: 'fallback_1', err: err.message })
    );
    expect(res1.isFallback).toBe(true);

    // Failure 2 -> Trips circuit
    const res2 = await cb.execute(
      () => { throw new Error('Primary failure 2'); },
      (err) => ({ data: 'fallback_2', err: err.message })
    );
    expect(res2.isFallback).toBe(true);
    expect(res2.circuitState).toBe('OPEN');

    // Immediate next call returns fallback directly without calling primary
    const res3 = await cb.execute(
      () => { throw new Error('Should not be called'); },
      (err) => ({ data: 'fallback_3', err: err.message })
    );
    expect(res3.isFallback).toBe(true);
    expect(res3.circuitState).toBe('OPEN');
  });
});
