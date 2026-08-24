# TrustGraph ML Risk Engine Architecture & Evaluation

## 1. Overview
The TrustGraph ML Risk Engine replaces simplistic manual heuristics with a deterministic, calibrated machine learning pipeline for transaction risk scoring.

> [!IMPORTANT]
> **Synthetic Dataset Notice**: All training and validation datasets used in this prototype are generated synthetically using pseudo-random seed algorithms. They do not represent real-world customer transactions or proprietary financial data. Performance metrics reflect performance on this synthetic distribution and must not be interpreted as production guarantees.

---

## 2. Model Architecture

### Baseline Model: Regularized Logistic Regression
* **Class**: `LogisticRegressionModel` (`src/ml/logisticRegression.js`)
* **Objective**: Binary Log-Likelihood / Cross-Entropy Loss with L2 Regularization penalty (\(\lambda = 0.005\)).
* **Optimizer**: Mini-Batch Stochastic Gradient Descent (SGD) with learning rate decay (\(\eta_0 = 0.08, \text{decay} = 0.98\)).
* **Activation**: Sigmoid probability mapping:
  \[
  P(\text{Risk} = 1 \mid \mathbf{x}) = \sigma(\mathbf{w}^T \mathbf{x} + b) = \frac{1}{1 + e^{-(\mathbf{w}^T \mathbf{x} + b)}}
  \]

### Primary Model: Gradient Boosted Decision Trees (GBDT)
* **Class**: `GradientBoostedTreesModel` (`src/ml/gradientBoostedTrees.js`)
* **Objective**: Binomial Cross-Entropy Loss optimization via shallow regression tree stumps (\(\text{depth} = 3\)).
* **Ensemble Size**: 30 boosting estimators with learning rate shrinkage (\(\eta = 0.12\)).
* **Leaf Updating**: Second-order Newton-Raphson leaf updates on pseudo-residuals:
  \[
  \gamma_{jm} = \frac{\sum_{i \in R_{jm}} r_{im}}{\sum_{i \in R_{jm}} p_{im}(1 - p_{im}) + \lambda}
  \]
* **Attribution**: Feature importance computed via split variance reduction gain.

---

## 3. Dataset Structure & Partitioning

* **Generator**: `DatasetGenerator` (`src/ml/datasetGenerator.js`)
* **Total Samples**: 2,000 synthetic transaction events (Seed: `4242`).
* **Base Latent Fraud Rate**: ~10.35%.
* **Partitioning (Zero Data Leakage)**:
  * **Train Set (70%)**: 1,400 samples (used for scaler fitting and model training).
  * **Validation Set (15%)**: 300 samples (used for optimal decision threshold calibration).
  * **Held-Out Test Set (15%)**: 300 samples (strictly unseen during training/tuning, used for final benchmark).

### Schema (19 Deterministic Features)

| Feature Name | Type | Description |
| :--- | :--- | :--- |
| `transactionAmount` | Float | Transaction dollar value |
| `transactionFrequency` | Int | Transaction count in rolling 24-hour window |
| `transactionVelocity` | Int | Transactions in last 1 hour |
| `merchantAge` | Int | Merchant account tenure in days |
| `customerAge` | Int | Customer age in years |
| `failedAttempts` | Int | Prior failed authorization attempts in session |
| `accountAge` | Int | Customer account age in days |
| `deviceAge` | Int | Device fingerprint first-seen age in days |
| `deviceChanges` | Int | Device changes detected on account |
| `ipRisk` | Float | IP reputation score (0.0 clean to 1.0 suspicious) |
| `countryMismatch` | Int | Binary flag indicating card vs IP geo-mismatch |
| `emailAge` | Int | Email address domain age in days |
| `refundRatio` | Float | Historical refund-to-charge ratio |
| `chargebackHistory` | Int | Count of historical chargebacks |
| `previousFraudCount` | Int | Count of confirmed fraud incidents |
| `timeSincePrevTx` | Int | Elapsed time since preceding transaction (minutes) |
| `unusualAmountRatio` | Float | Ratio of current amount to historical average |
| `sharedDeviceCount` | Int | Entities sharing same hardware device identifier |
| `sharedIpCount` | Int | Entities sharing same IP subnet address |

---

## 4. Feature Engineering Pipeline (`src/ml/featurePipeline.js`)

* **Input Validation & Imputation**: Coerces incoming payload types and imputes missing fields using training-set medians/modes.
* **Deterministic Feature Ordering**: Enforces strict 19-dimensional array ordering matching model weights.
* **Standardization**: Computes Z-score normalization (\(\mu, \sigma\)) exclusively fitted on the 70% training split:
  \[
  z_i = \frac{x_i - \mu_{\text{train}}}{\sigma_{\text{train}}}
  \]
* **Versioning**: Tracked as `features-v1.0.0`.

---

## 5. Model Comparison & Measured Test Metrics

Evaluated on the **Held-Out Test Set (300 unseen samples, 35 true fraud cases)**:

| Metric | Baseline (Logistic Regression) | Primary (GBDT Ensemble) |
| :--- | :--- | :--- |
| **Model Version** | `logreg-risk-v1.0.0` | `gbdt-risk-v1.0.0` |
| **Accuracy** | 99.33% | **99.33%** |
| **Precision** | 100.0% | **100.0%** |
| **Recall / Sensitivity** | 94.29% | **94.29%** |
| **Specificity** | 100.0% | **100.0%** |
| **F1 Score** | 0.9706 | **0.9706** |
| **ROC-AUC** | 0.9705 | **0.9620** |
| **True Positives (TP)** | 33 | 33 |
| **False Positives (FP)** | 0 | 0 |
| **True Negatives (TN)** | 265 | 265 |
| **False Negatives (FN)** | 2 | 2 |
| **Total Test Loss (USD)** | $239.46 | **$239.46** |

---

## 6. Cost-Sensitive Loss Decision Formulation

The ML model computes calibrated `riskProbability` (\(P(\text{Fraud})\)).
Expected financial loss is formulated as:
\[
\mathbb{E}[\text{Loss}] = P(\text{Fraud}) \times \text{TransactionAmount}
\]

* The ML model serves strictly as an **advisory risk signal** and does not execute hard blocking autonomously.
* The output is passed to the **Deterministic Policy Engine** along with business constraints (`amount`, `velocity`, `compliance rules`) to reach the final deterministic action (`APPROVE`, `STEP_UP_KYC`, `MANUAL_REVIEW`, `REJECT_BLOCK`).

---

## 7. Model Execution & Training Commands

```bash
# 1. Train and evaluate models on fresh synthetic split
npm run ml:train

# 2. Run all unit & integration test suites
npm test

# 3. Predict risk via API
curl -X POST http://localhost:5000/api/v1/trust-score/predict-risk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "transactionAmount": 1500.0,
    "transactionVelocity": 12,
    "failedAttempts": 3,
    "ipRisk": 0.85,
    "accountAge": 3
  }'
```
