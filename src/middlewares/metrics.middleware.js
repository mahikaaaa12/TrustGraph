/**
 * Prometheus / OpenTelemetry Metrics Collector Middleware
 */
class MetricsCollector {
  constructor() {
    this.httpRequestsTotal = new Map();
    this.durations = [];
    this.modelEvaluations = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    this.totalExpectedLossUSD = 0;
  }

  recordHttpRequest(method, route, statusCode, durationMs) {
    const key = `${method}_${route}_${statusCode}`;
    this.httpRequestsTotal.set(key, (this.httpRequestsTotal.get(key) || 0) + 1);
    this.durations.push(durationMs);
    if (this.durations.length > 2000) this.durations.shift();
  }

  recordModelEvaluation(tier, expectedLossUSD = 0) {
    if (this.modelEvaluations[tier] !== undefined) {
      this.modelEvaluations[tier]++;
    }
    this.totalExpectedLossUSD += Number(expectedLossUSD) || 0;
  }

  toPrometheusFormat() {
    const lines = [
      '# HELP trustgraph_http_requests_total Total number of HTTP requests processed.',
      '# TYPE trustgraph_http_requests_total counter',
    ];

    for (const [key, count] of this.httpRequestsTotal.entries()) {
      const [method, route, status] = key.split('_');
      lines.push(`trustgraph_http_requests_total{method="${method}",path="${route}",status="${status}"} ${count}`);
    }

    const avgDuration = this.durations.length > 0 ? (this.durations.reduce((a, b) => a + b, 0) / this.durations.length) / 1000 : 0;
    lines.push('');
    lines.push('# HELP trustgraph_http_request_duration_seconds Average latency in seconds.');
    lines.push('# TYPE trustgraph_http_request_duration_seconds gauge');
    lines.push(`trustgraph_http_request_duration_seconds ${avgDuration.toFixed(4)}`);

    lines.push('');
    lines.push('# HELP trustgraph_model_evaluations_total Total ML risk evaluations by tier.');
    lines.push('# TYPE trustgraph_model_evaluations_total counter');
    for (const [tier, count] of Object.entries(this.modelEvaluations)) {
      lines.push(`trustgraph_model_evaluations_total{tier="${tier}"} ${count}`);
    }

    lines.push('');
    lines.push('# HELP trustgraph_expected_loss_usd_total Cumulative dollar loss mitigated.');
    lines.push('# TYPE trustgraph_expected_loss_usd_total counter');
    lines.push(`trustgraph_expected_loss_usd_total ${this.totalExpectedLossUSD.toFixed(2)}`);

    return lines.join('\n');
  }
}

const metricsCollector = new MetricsCollector();

const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const pathPattern = req.baseUrl || req.path || '/';
    metricsCollector.recordHttpRequest(req.method, pathPattern, res.statusCode, duration);
  });
  next();
};

module.exports = {
  metricsCollector,
  metricsMiddleware,
};
