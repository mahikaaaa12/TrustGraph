/**
 * Cost-Sensitive Expected-Loss & Financial Risk Calculation Service
 * Computes business-loss optimization metrics and decision recommendations.
 */
class LossCalculatorService {
  static DEFAULT_PARAMETERS = Object.freeze({
    chargebackFeeUSD: 15.0,
    manualReviewCostUSD: 3.5,
    stepUpAuthCostUSD: 0.10,
  });

  /**
   * Calculates Expected Dollar Loss and optimal action.
   * Formula: E[Loss] = P(Fraud) * Amount + (ChargebackFee * P(Fraud))
   * @param {number} fraudProbability - Model predicted risk probability [0, 1]
   * @param {number} transactionAmount - Dollar value of the transaction
   * @param {Object} customParams - Configurable fee overrides
   */
  static calculateExpectedLoss(fraudProbability = 0, transactionAmount = 0, customParams = {}) {
    const pFraud = Math.max(0, Math.min(1, Number(fraudProbability) || 0));
    const amount = Math.max(0, Number(transactionAmount) || 0);

    const chargebackFee = customParams.chargebackFeeUSD ?? this.DEFAULT_PARAMETERS.chargebackFeeUSD;
    const reviewCost = customParams.manualReviewCostUSD ?? this.DEFAULT_PARAMETERS.manualReviewCostUSD;
    const stepUpCost = customParams.stepUpAuthCostUSD ?? this.DEFAULT_PARAMETERS.stepUpAuthCostUSD;

    // Expected loss if transaction is APPROVED unconditionally
    const expectedLossIfApproved = pFraud * amount + pFraud * chargebackFee;

    // Determine cost-optimal action
    let recommendedAction = 'APPROVE';
    let rational = 'Expected loss is within normal operational risk bounds.';

    if (pFraud >= 0.80 || expectedLossIfApproved > 250) {
      recommendedAction = 'REJECT_BLOCK';
      rational = `High fraud probability (${(pFraud * 100).toFixed(0)}%) or expected loss ($${expectedLossIfApproved.toFixed(2)}) exceeds maximum risk tolerance threshold.`;
    } else if (pFraud >= 0.45 || expectedLossIfApproved > 50) {
      recommendedAction = 'MANUAL_REVIEW';
      rational = `Elevated risk profile ($${expectedLossIfApproved.toFixed(2)} expected loss). Manual review cost ($${reviewCost.toFixed(2)}) is cost-effective compared to approving.`;
    } else if (pFraud >= 0.15 || expectedLossIfApproved > 5) {
      recommendedAction = 'STEP_UP_KYC';
      rational = `Low-to-moderate risk ($${expectedLossIfApproved.toFixed(2)} expected loss). Step-up authentication challenge ($${stepUpCost.toFixed(2)}) recommended.`;
    }

    return {
      transactionAmount: parseFloat(amount.toFixed(2)),
      fraudProbability: parseFloat(pFraud.toFixed(4)),
      expectedLossUSD: parseFloat(expectedLossIfApproved.toFixed(2)),
      recommendedAction,
      rational,
      costMatrix: {
        costIfApproved: parseFloat(expectedLossIfApproved.toFixed(2)),
        manualReviewCost: reviewCost,
        stepUpAuthCost: stepUpCost,
        chargebackFee,
      },
    };
  }
}

module.exports = LossCalculatorService;
