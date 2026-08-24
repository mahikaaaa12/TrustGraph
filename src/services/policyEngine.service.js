/**
 * Deterministic Declarative Policy Rule Engine
 * Evaluates priority-ordered enterprise security and risk policies.
 * Standard Decisions: ALLOW | REVIEW | BLOCK
 */

class PolicyEngineService {
  static POLICY_VERSION = 'policies-v1.2.0';

  static DEFAULT_POLICIES = [
    // 1. Critical Hard Blockers (Priority 100 - 90)
    {
      id: 'POL-BLOCK-001',
      name: 'Critical PII Leak Exposure',
      description: 'Block transactions/documents with multiple critical PII or secret key exposures.',
      condition: {
        all: [{ field: 'piiLeaks', operator: 'GREATER_THAN', value: 2 }],
      },
      action: 'BLOCK',
      priority: 100,
    },
    {
      id: 'POL-BLOCK-002',
      name: 'Critical Phishing Impersonation',
      description: 'Block transactions targeting confirmed credential phishing destinations.',
      condition: {
        all: [{ field: 'phishingLikelihood', operator: 'GREATER_THAN_OR_EQUAL', value: 0.70 }],
      },
      action: 'BLOCK',
      priority: 95,
    },
    {
      id: 'POL-BLOCK-003',
      name: 'Severe Expected Dollar Loss',
      description: 'Block transactions where statistical expected loss exceeds $500 threshold.',
      condition: {
        all: [{ field: 'expectedLoss', operator: 'GREATER_THAN_OR_EQUAL', value: 500 }],
      },
      action: 'BLOCK',
      priority: 90,
    },
    {
      id: 'POL-BLOCK-004',
      name: 'Circular Collusion Ring with Device Farm',
      description: 'Block circular transfer loops operating from shared device hardware.',
      condition: {
        all: [
          { field: 'ringCycleCount', operator: 'GREATER_THAN', value: 0 },
          { field: 'sharedDeviceCount', operator: 'GREATER_THAN_OR_EQUAL', value: 2 },
        ],
      },
      action: 'BLOCK',
      priority: 88,
    },
    {
      id: 'POL-BLOCK-005',
      name: 'Critical ML Risk Tier',
      description: 'Block when calibrated ML fraud probability exceeds 0.80.',
      condition: {
        all: [{ field: 'fraudProbability', operator: 'GREATER_THAN_OR_EQUAL', value: 0.80 }],
      },
      action: 'BLOCK',
      priority: 85,
    },

    // 2. High Risk Reviews (Priority 80 - 60)
    {
      id: 'POL-REVIEW-001',
      name: 'Elevated Expected Loss Review',
      description: 'Send transaction to manual compliance review when expected loss exceeds $150.',
      condition: {
        all: [{ field: 'expectedLoss', operator: 'GREATER_THAN_OR_EQUAL', value: 150 }],
      },
      action: 'REVIEW',
      priority: 80,
    },
    {
      id: 'POL-REVIEW-002',
      name: 'Shared Device Sybil Cluster',
      description: 'Review accounts sharing physical hardware with 3 or more other accounts.',
      condition: {
        all: [{ field: 'sharedDeviceCount', operator: 'GREATER_THAN_OR_EQUAL', value: 3 }],
      },
      action: 'REVIEW',
      priority: 75,
    },
    {
      id: 'POL-REVIEW-003',
      name: 'High Velocity Burst Review',
      description: 'Review rapid burst events exceeding 8 actions per hour.',
      condition: {
        all: [{ field: 'transactionVelocity', operator: 'GREATER_THAN_OR_EQUAL', value: 8 }],
      },
      action: 'REVIEW',
      priority: 70,
    },
    {
      id: 'POL-REVIEW-004',
      name: 'Circular Collusion Loop Review',
      description: 'Review entities participating in circular fund movement cycles.',
      condition: {
        all: [{ field: 'ringCycleCount', operator: 'GREATER_THAN', value: 0 }],
      },
      action: 'REVIEW',
      priority: 68,
    },
    {
      id: 'POL-REVIEW-005',
      name: 'Elevated ML Risk Probability',
      description: 'Review when calibrated ML fraud probability is in elevated range [0.35, 0.80).',
      condition: {
        all: [{ field: 'fraudProbability', operator: 'GREATER_THAN_OR_EQUAL', value: 0.35 }],
      },
      action: 'REVIEW',
      priority: 65,
    },
    {
      id: 'POL-REVIEW-006',
      name: 'Model Unavailable Safety Fallback',
      description: 'Require analyst review if ML model inference was unavailable and amount > $100.',
      condition: {
        all: [
          { field: 'isFallback', operator: 'EQUALS', value: true },
          { field: 'amount', operator: 'GREATER_THAN_OR_EQUAL', value: 100 },
        ],
      },
      action: 'REVIEW',
      priority: 60,
    },
  ];

  static evaluateAtomicCondition(record, { field, operator, value }) {
    const actualVal = record[field];
    if (actualVal === undefined || actualVal === null) return false;

    switch (operator.toUpperCase()) {
      case 'EQUALS':
      case 'EQ':
        return actualVal === value;
      case 'NOT_EQUALS':
      case 'NEQ':
        return actualVal !== value;
      case 'GREATER_THAN':
      case 'GT':
        return Number(actualVal) > Number(value);
      case 'GREATER_THAN_OR_EQUAL':
      case 'GTE':
        return Number(actualVal) >= Number(value);
      case 'LESS_THAN':
      case 'LT':
        return Number(actualVal) < Number(value);
      case 'LESS_THAN_OR_EQUAL':
      case 'LTE':
        return Number(actualVal) <= Number(value);
      case 'CONTAINS':
        return String(actualVal).toLowerCase().includes(String(value).toLowerCase());
      case 'IN':
        return Array.isArray(value) && value.includes(actualVal);
      case 'NOT_IN':
        return Array.isArray(value) && !value.includes(actualVal);
      default:
        return false;
    }
  }

  static evaluateCondition(record, condition) {
    if (!condition) return false;
    const cond = condition.condition || condition;
    if (cond.all && Array.isArray(cond.all)) {
      return cond.all.every((c) => this.evaluateAtomicCondition(record, c));
    }
    if (cond.any && Array.isArray(cond.any)) {
      return cond.any.some((c) => this.evaluateAtomicCondition(record, c));
    }
    if (cond.field && cond.operator) {
      return this.evaluateAtomicCondition(record, cond);
    }
    return false;
  }

  /**
   * Executes deterministic policy evaluation.
   * Standard outputs: ALLOW | REVIEW | BLOCK
   */
  static evaluatePolicies(context = {}, customPolicies = null) {
    const policies = (customPolicies || this.DEFAULT_POLICIES)
      .slice()
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    const matchedRules = [];
    const evaluationLogs = [];

    for (const policy of policies) {
      const matched = this.evaluateCondition(context, policy);
      evaluationLogs.push({
        policyId: policy.id,
        policyName: policy.name,
        action: policy.action,
        matched,
      });

      if (matched) {
        matchedRules.push(policy);
      }
    }

    // Determine highest-priority deterministic action
    let finalDecision = 'ALLOW';
    let decisionReason = 'All security and risk policy boundaries satisfied.';
    let triggeredPolicy = null;

    if (matchedRules.length > 0) {
      triggeredPolicy = matchedRules[0];
      finalDecision = triggeredPolicy.action;
      decisionReason = `Triggered by [${triggeredPolicy.id}] ${triggeredPolicy.name}: ${triggeredPolicy.description}`;
    } else if (context.isFallback) {
      // Safety rule: if ML model was unavailable and no other rule triggered, fallback to REVIEW for caution
      if ((context.amount || context.transactionAmount || 0) > 50) {
        finalDecision = 'REVIEW';
        decisionReason = 'ML inference unavailable; transaction exceeded safety review threshold ($50).';
      }
    }

    return {
      policyVersion: this.POLICY_VERSION,
      decision: finalDecision,
      decisionReason,
      triggeredPolicy: triggeredPolicy
        ? { id: triggeredPolicy.id, name: triggeredPolicy.name, action: triggeredPolicy.action }
        : null,
      matchedRulesCount: matchedRules.length,
      matchedRules: matchedRules.map((r) => ({
        id: r.id,
        name: r.name,
        action: r.action,
        priority: r.priority,
      })),
      evaluationLogs,
    };
  }
}

module.exports = PolicyEngineService;
