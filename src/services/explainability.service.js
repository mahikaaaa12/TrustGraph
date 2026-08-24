/**
 * Explainability & Counterfactual Decision Engine
 * Computes transparent feature attributions, waterfall impact values, and counterfactual recommendations.
 */
class ExplainabilityService {
  /**
   * Generates Explainable Decision Payload from ML Prediction and Heuristics
   */
  static generateExplanation(mlPrediction, rawInputs = {}) {
    const {
      fraudProbability = 0,
      trustScore = 100,
      riskTier = 'LOW',
      featureContributions = [],
      rawFeatures = {},
    } = mlPrediction;

    // Separate positive (protective) and negative (risk-increasing) factors
    const riskDrivers = [];
    const protectiveFactors = [];

    for (const item of featureContributions) {
      const friendlyName = this.formatFeatureName(item.feature);
      if (item.impact > 0.1) {
        riskDrivers.push({
          feature: item.feature,
          name: friendlyName,
          impact: item.impact,
          severity: item.impact > 1.0 ? 'HIGH' : 'MEDIUM',
          rawValue: item.rawValue,
          description: this.getFeatureRiskDescription(item.feature, item.rawValue),
        });
      } else if (item.impact < -0.1) {
        protectiveFactors.push({
          feature: item.feature,
          name: friendlyName,
          impact: Math.abs(item.impact),
          rawValue: item.rawValue,
          description: this.getFeatureProtectiveDescription(item.feature, item.rawValue),
        });
      }
    }

    // Generate Counterfactual Recommendations ("What if?")
    const counterfactuals = this.generateCounterfactuals(rawInputs, mlPrediction);

    return {
      summary: `Decision: ${riskTier} Risk (${trustScore}% Trust Index). Evaluated across ${featureContributions.length} standardized model features.`,
      topRiskDrivers: riskDrivers.slice(0, 5),
      protectiveFactors: protectiveFactors.slice(0, 5),
      counterfactuals,
      waterfallBreakdown: featureContributions.map((fc) => ({
        feature: fc.feature,
        label: this.formatFeatureName(fc.feature),
        contribution: fc.impact,
        direction: fc.impact >= 0 ? 'INCREASES_RISK' : 'REDUCES_RISK',
      })),
    };
  }

  /**
   * Generates What-If Counterfactual Recommendations to improve trust score.
   */
  static generateCounterfactuals(rawInputs, mlPrediction) {
    const recommendations = [];

    if ((rawInputs.piiLeaks || 0) > 0) {
      recommendations.push({
        action: 'Redact sensitive PII and API keys',
        currentValue: `${rawInputs.piiLeaks} exposed leak(s)`,
        targetValue: '0 leaks',
        estimatedScoreImprovement: '+18.5 pts',
        priority: 'HIGH',
      });
    }

    if ((rawInputs.securityScore || 100) < 75) {
      recommendations.push({
        action: 'Enable active TLS encryption with trusted CA certificate',
        currentValue: `Security Score: ${rawInputs.securityScore}%`,
        targetValue: 'Security Score: ≥ 90%',
        estimatedScoreImprovement: '+14.0 pts',
        priority: 'HIGH',
      });
    }

    if ((rawInputs.authenticityScore || 100) < 70) {
      recommendations.push({
        action: 'Provide unedited sensor metadata or human-authored text provenance',
        currentValue: `Authenticity: ${rawInputs.authenticityScore}%`,
        targetValue: 'Authenticity: ≥ 85%',
        estimatedScoreImprovement: '+16.2 pts',
        priority: 'MEDIUM',
      });
    }

    if ((rawInputs.socialEngLikelihood || 0) > 0.3) {
      recommendations.push({
        action: 'Remove artificial urgency, account threat language, and credential prompts',
        currentValue: `Urgency Threat: ${(rawInputs.socialEngLikelihood * 100).toFixed(0)}%`,
        targetValue: 'Urgency Threat: 0%',
        estimatedScoreImprovement: '+20.0 pts',
        priority: 'CRITICAL',
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        action: 'Maintain current security controls and verified metadata provenance',
        currentValue: 'Compliant',
        targetValue: 'Optimal',
        estimatedScoreImprovement: '+0.0 pts (Baseline already optimal)',
        priority: 'LOW',
      });
    }

    return recommendations;
  }

  static formatFeatureName(name) {
    const map = {
      authenticityDeficit: 'Authenticity Deficit',
      securityVulnerability: 'Security & TLS Vulnerability',
      metadataTamperScore: 'Metadata Provenance Gap',
      reputationRisk: 'Source Reputation Risk',
      piiLeakSeverity: 'PII & Credential Leaks',
      phishingProbability: 'Phishing Pattern Likelihood',
      imageTamperEvidence: 'Image ELA / Photoshop Tampering',
      aiSyntheticIndicator: 'AI Synthetic Content Likelihood',
      domainSuspicion: 'Suspicious Domain / Hostname',
      socialEngThreat: 'Social Engineering Threat',
      amountAnomaly: 'Transaction Amount Deviation',
      velocitySurge: 'Event Velocity Burst',
    };
    return map[name] || name;
  }

  static getFeatureRiskDescription(name, val) {
    const map = {
      authenticityDeficit: 'Elevated variance or synthetic stylometric patterns detected.',
      securityVulnerability: 'Missing TLS encryption, certificate warning, or unencrypted sockets.',
      metadataTamperScore: 'Stripped EXIF headers or inconsistent file creation timestamps.',
      reputationRisk: 'Domain flagged on threat intelligence blacklists or clickbait patterns.',
      piiLeakSeverity: 'Sensitive API secrets, SSNs, or credit card numbers exposed in payload.',
      phishingProbability: 'Credential harvesting indicators and brand impersonation triggers found.',
      imageTamperEvidence: 'Error Level Analysis (ELA) detected compression grid anomalies.',
      aiSyntheticIndicator: 'Document or text exhibits high probability of AI model generation.',
      domainSuspicion: 'Hostname uses raw IP or high-risk top-level domain.',
      socialEngThreat: 'Urgent threats or password submission demands detected.',
      amountAnomaly: 'Transaction value significantly exceeds historical baseline.',
      velocitySurge: 'High frequency of requests in a narrow time window.',
    };
    return map[name] || `Elevated risk signal detected on ${name}.`;
  }

  static getFeatureProtectiveDescription(name, val) {
    return `Verified clean telemetry on ${this.formatFeatureName(name)}.`;
  }
}

module.exports = ExplainabilityService;
