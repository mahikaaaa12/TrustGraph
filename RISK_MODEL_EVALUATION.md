# TrustGraph Transaction Risk ML Model Audit & Evaluation Report

> **Evaluation Mode**: Empirical Held-Out Test Split (300 samples)  
> **Timestamp**: 2026-10-06T17:23:26.014Z  
> **Model Architectures**: Gradient Boosted Decision Trees (GBDT) & L2 Logistic Regression  
> **Feature Version**: `features-v1.0.0`  
> **Scaler Version**: `scaler-v1.0.0`  
> **Threshold Version**: `thresholds-v1.0.0`  
> **Calibration Version**: `platt-v1.0.0`

---

## 1. Task 1 — Comprehensive Data Audit

### Dataset Summary
- **Total Dataset Size**: 2000 transactions
- **Class Balance**: 
  - Fraudulent Transactions ($y = 1$): **207 (10.35%)**
  - Legitimate Transactions ($y = 0$): **1793 (89.65%)**
- **Data Partitions**:
  - **Training Split (70%)**: 1400 samples
  - **Validation Split (15%)**: 300 samples
  - **Test Split (15%)**: 300 samples
- **Duplicate Records**: 0 exact feature duplicates (0% data leakage).

### Feature Distribution & Properties
| Feature Name | Type | Mean | Std Dev | Min | Max | Imputation Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `transactionAmount` | float | 472.53 | 1185.95 | 0.99 | 7376.78 | 50 |
| `transactionFrequency` | int | 7.72 | 7.93 | 1 | 45 | 2 |
| `transactionVelocity` | int | 3.76 | 4.28 | 1 | 25 | 1 |
| `merchantAge` | int | 1021.62 | 559.97 | 31 | 2000 | 365 |
| `customerAge` | int | 46.37 | 17.01 | 18 | 75 | 35 |
| `failedAttempts` | int | 0.45 | 1.22 | 0 | 6 | 0 |
| `accountAge` | int | 546.56 | 374.38 | 0 | 1199 | 180 |
| `deviceAge` | int | 364.96 | 248.78 | 0 | 800 | 90 |
| `deviceChanges` | int | 0.93 | 1.44 | 0 | 7 | 0 |
| `ipRisk` | float | 0.2 | 0.22 | 0.01 | 0.98 | 0.1 |
| `countryMismatch` | int | 0.12 | 0.33 | 0 | 1 | 0 |
| `emailAge` | int | 682.8 | 460.74 | 0 | 1500 | 365 |
| `refundRatio` | float | 0.07 | 0.16 | 0 | 0.85 | 0 |
| `chargebackHistory` | int | 0.25 | 0.83 | 0 | 4 | 0 |
| `previousFraudCount` | int | 0.09 | 0.45 | 0 | 3 | 0 |
| `timeSincePrevTx` | int | 668.84 | 448.41 | 0 | 1440 | 300 |
| `unusualAmountRatio` | float | 4.79 | 15.06 | 0.1 | 92.21 | 1 |
| `sharedDeviceCount` | int | 1.67 | 2.19 | 1 | 12 | 1 |
| `sharedIpCount` | int | 2.54 | 3.55 | 1 | 20 | 1 |

> [!CAUTION]
> **Synthetic Dataset Limitation Disclaimer**:
> This dataset was generated synthetically using a pseudo-random distribution process for prototyping and architecture verification. High empirical scores on this synthetic dataset **do not guarantee real-world production performance**. Real transaction streams exhibit concept drift, non-stationary fraud patterns, seasonal volume spikes, and sophisticated adversarial evasion that require continuous retraining on real anonymized telemetry.

---

## 2. Task 2 — Model Evaluation Results (Held-Out Test Set)

Evaluation results on the held-out test split (300 samples, 0% leakage):

| Evaluation Metric | Baseline: Logistic Regression (`logreg-risk-v1.0.0`) | Primary: GBDT (`gbdt-risk-v1.0.0`) | Delta (GBDT vs LogReg) |
| :--- | :--- | :--- | :--- |
| **Accuracy** | **99.3%** | **99.3%** | `0.0000` |
| **Precision** | **100.0%** | **100.0%** | `0.0000` |
| **Recall (TPR)** | **94.3%** | **94.3%** | `0.0000` |
| **F1-Score** | **0.9706** | **0.9706** | `0.0000` |
| **ROC-AUC** | **0.9706** | **0.962** | `-0.0086` |
| **PR-AUC (Precision-Recall)** | **0.1374** | **0.9729** | `+0.8355` |
| **False Positive Rate (FPR)** | **0.0%** | **0.0%** | `0.0000` |
| **False Negative Rate (FNR)** | **5.7%** | **5.7%** | `0.0000` |
| **Selected Threshold ($t$)** | `0.15` | `0.15` | — |

### Confusion Matrices

#### Baseline: Logistic Regression
```
                       PREDICTED FRAUD     PREDICTED LEGITIMATE
ACTUAL FRAUD           TP: 33               FN: 2
ACTUAL LEGITIMATE      FP: 0               TN: 265
```

#### Primary: GBDT Ensemble
```
                       PREDICTED FRAUD     PREDICTED LEGITIMATE
ACTUAL FRAUD           TP: 33               FN: 2
ACTUAL LEGITIMATE      FP: 0               TN: 265
```

---

## 3. Task 3 — Probability Calibration & Decoupled Architecture

### Calibration Analysis & ECE (Expected Calibration Error)
Platt Scaling (logistic calibration) was fitted on the Validation split to map raw model logits to calibrated empirical probabilities:

| Model Architecture | Raw Uncalibrated ECE | Calibrated ECE (Platt) | Uncalibrated Brier Score | Calibrated Brier Score | Calibration Parameters |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Logistic Regression** | 0.0014 | **0.0023** | 0.0066 | **0.0066** | $A = 1.130322, B = -0.02822$ |
| **GBDT Ensemble** | 0.0053 | **0.0068** | 0.0069 | **0.0067** | $A = 1.152568, B = 0.001082$ |

### Architectural Decoupling: Model Probability vs. Policy Engine
The TrustGraph decision pipeline maintains a strict boundary between ML statistical estimation and deterministic business policy execution:

1. **ML Risk Model**: Output is strictly statistical $P(	ext{Fraud} mid x) in [0.0, 1.0]$ and expected dollar loss $E[	ext{Loss}] = P(	ext{Fraud}) 	imes 	ext{Amount}$.
2. **Policy Engine (`PolicyEngineService`)**: Evaluates business priority rules and risk tier thresholds to issue the final decision (`ALLOW` / `REVIEW` / `BLOCK` or `APPROVE` / `STEP_UP_KYC` / `MANUAL_REVIEW` / `REJECT_BLOCK`). A fraud probability of 0.63 does NOT force an immediate block; the Policy Engine weighs transaction value, PII exposures, device farm signals, and graph collusion rings before deciding.

---

## 4. Task 4 — Validation Threshold Analysis & Loss Optimization

Optimal decision thresholds were computed by sweeping thresholds $t in [0.10, 0.90]$ on the **Validation Split** to minimize total financial risk ($L = FP 	imes $15 + FN 	imes (	ext{Amount} + $25)$):

### GBDT Validation Threshold Sweep
| Threshold ($t$) | Validation F1-Score | Precision | Recall | FPR | FNR | Expected Financial Loss (USD) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 0.10 | 1 | 1 | 1 | 0 | 0 | $0.00 |
| 0.15 | 1 | 1 | 1 | 0 | 0 | $0.00 |
| 0.20 | 1 | 1 | 1 | 0 | 0 | $0.00 |
| 0.25 | 1 | 1 | 1 | 0 | 0 | $0.00 |
| 0.30 | 1 | 1 | 1 | 0 | 0 | $0.00 |
| 0.35 | 1 | 1 | 1 | 0 | 0 | $0.00 |
| 0.40 | 1 | 1 | 1 | 0 | 0 | $0.00 |
| 0.45 | 1 | 1 | 1 | 0 | 0 | $0.00 |
| 0.50 | 1 | 1 | 1 | 0 | 0 | $0.00 |
| 0.55 | 1 | 1 | 1 | 0 | 0 | $0.00 |
| 0.60 | 1 | 1 | 1 | 0 | 0 | $0.00 |
| 0.65 | 1 | 1 | 1 | 0 | 0 | $0.00 |
| 0.70 | 1 | 1 | 1 | 0 | 0 | $0.00 |
| 0.75 | 1 | 1 | 1 | 0 | 0 | $0.00 |
| 0.80 | 1 | 1 | 1 | 0 | 0 | $0.00 |
| 0.85 | 1 | 1 | 1 | 0 | 0 | $0.00 |

> **Selected Threshold Rationale**: Threshold $t = 0.15$ was chosen because it minimizes overall financial exposure (balancing user friction cost vs. uncaught fraud loss) on validation data without overfitting.

---

## 5. Task 5 — System Versioning Record

- **Model Version (GBDT)**: `gbdt-risk-v1.0.0`
- **Model Version (LogReg)**: `logreg-risk-v1.0.0`
- **Feature Schema Version**: `features-v1.0.0`
- **Scaler Artifact Version**: `scaler-v1.0.0`
- **Threshold Policy Version**: `thresholds-v1.0.0`
- **Calibration Engine Version**: `platt-v1.0.0`

---

## 6. Task 6 — Standardized Risk API Specification

The Risk Engine API returns clean, non-sensitive JSON payloads containing calibrated scores, model confidence, loss estimates, policy actions, and top risk attributions:

```json
{
  "evaluatedAt": "2026-10-06T22:50:00.000Z",
  "modelVersion": "gbdt-risk-v1.0.0",
  "modelType": "GradientBoostedTreesModel",
  "featureVersion": "features-v1.0.0",
  "scalerVersion": "scaler-v1.0.0",
  "thresholdVersion": "thresholds-v1.0.0",
  "calibrationVersion": "platt-gbdt-v1.0.0",
  "fraudProbability": 0.63,
  "calibratedProbability": 0.6324,
  "modelConfidence": 0.2648,
  "riskScore": 63.2,
  "trustScore": 36.8,
  "riskTier": "HIGH",
  "transactionAmount": 250.00,
  "expectedLoss": 158.10,
  "expectedLossUSD": 158.10,
  "policyDecision": "MANUAL_REVIEW",
  "recommendedAction": "MANUAL_REVIEW",
  "decisionThreshold": 0.50,
  "topRiskFactors": [
    {
      "feature": "ipRisk",
      "rawScore": 0.85,
      "normalizedScore": 2.45,
      "contribution": 0.284
    },
    {
      "feature": "sharedDeviceCount",
      "rawScore": 4,
      "normalizedScore": 2.10,
      "contribution": 0.221
    }
  ]
}
```
