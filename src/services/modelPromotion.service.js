const TrainPipeline = require('../ml/trainPipeline');
const { defaultRiskEngine } = require('../ml/riskEngine.service');

/**
 * Controlled Model Retraining & Safe Model Promotion Governance Service
 * 
 * CRITICAL SAFETY RULE:
 * Retraining never automatically replaces the production model in serving memory.
 * Candidate models must undergo rigorous benchmark evaluation on the held-out test split
 * and satisfy strict performance gatekeeper thresholds before promotion eligibility.
 */
class ModelPromotionService {
  static PROMOTION_CRITERIA = {
    minRocAucDelta: -0.01, // Candidate ROC-AUC cannot drop by more than 0.01 vs production
    minF1Delta: -0.01, // Candidate F1 cannot drop by more than 0.01 vs production
    maxAllowedLossIncreaseRatio: 1.05, // Expected financial loss cannot exceed 105% of production
  };

  /**
   * Runs controlled retraining and evaluates candidate against production baseline.
   */
  static evaluateRetrainedCandidate(options = {}) {
    const { sampleCount = 2000, seed = 8888, candidateVersion = 'gbdt-risk-v1.1.0-candidate' } = options;

    // 1. Get current production baseline test metrics
    const currentReport = defaultRiskEngine.getModelComparison();
    const productionMetrics = currentReport.models.primary_gradient_boosted_trees.testEvaluation.metrics;
    const productionLoss = currentReport.models.primary_gradient_boosted_trees.testEvaluation.financialRisk.totalFinancialLoss;

    // 2. Train candidate model on fresh partitioned dataset
    const candidatePipeline = TrainPipeline.runPipeline({ sampleCount, seed });
    const candidateMetrics = candidatePipeline.report.models.primary_gradient_boosted_trees.testEvaluation.metrics;
    const candidateLoss = candidatePipeline.report.models.primary_gradient_boosted_trees.testEvaluation.financialRisk.totalFinancialLoss;

    // 3. Evaluate Gatekeeper Promotion Criteria
    const rocAucDelta = parseFloat((candidateMetrics.rocAuc - productionMetrics.rocAuc).toFixed(4));
    const f1Delta = parseFloat((candidateMetrics.f1Score - productionMetrics.f1Score).toFixed(4));
    const lossRatio = parseFloat((candidateLoss / Math.max(1, productionLoss)).toFixed(4));

    const checkRocAuc = rocAucDelta >= this.PROMOTION_CRITERIA.minRocAucDelta;
    const checkF1 = f1Delta >= this.PROMOTION_CRITERIA.minF1Delta;
    const checkLoss = lossRatio <= this.PROMOTION_CRITERIA.maxAllowedLossIncreaseRatio;

    const allPassed = checkRocAuc && checkF1 && checkLoss;

    const evaluationSummary = {
      evaluatedAt: new Date().toISOString(),
      productionModel: {
        version: currentReport.models.primary_gradient_boosted_trees.modelVersion,
        metrics: productionMetrics,
        financialLossUSD: productionLoss,
      },
      candidateModel: {
        version: candidateVersion,
        metrics: candidateMetrics,
        financialLossUSD: candidateLoss,
      },
      gatekeeperChecks: {
        rocAucCheck: {
          passed: checkRocAuc,
          delta: rocAucDelta,
          threshold: this.PROMOTION_CRITERIA.minRocAucDelta,
        },
        f1ScoreCheck: {
          passed: checkF1,
          delta: f1Delta,
          threshold: this.PROMOTION_CRITERIA.minF1Delta,
        },
        lossRatioCheck: {
          passed: checkLoss,
          lossRatio,
          threshold: this.PROMOTION_CRITERIA.maxAllowedLossIncreaseRatio,
        },
      },
      promotionStatus: allPassed ? 'PROMOTION_ELIGIBLE' : 'PROMOTION_REJECTED',
      promotionRecommended: allPassed,
      promotionEnacted: false, // Strict governance: requires manual authorized promotion
      rationale: allPassed
        ? 'Candidate model successfully satisfies all accuracy, stability, and loss mitigation thresholds.'
        : 'Candidate model failed one or more gatekeeper criteria. Production model remains active.',
    };

    return evaluationSummary;
  }
}

module.exports = ModelPromotionService;
