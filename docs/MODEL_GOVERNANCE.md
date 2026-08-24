# TrustGraph Model Governance & Promotion Protocol

## 1. Overview
The TrustGraph Machine Learning Governance framework ensures that production risk models operate within statistical stability parameters, receive human-in-the-loop validation, and are subject to strict automated gatekeepers before any model promotion occurs.

---

## 2. Telemetry & Prediction Logging

Every risk evaluation logs non-PII inference telemetry:
* `predictionId`: Unique identifier (UUID/timestamp-indexed).
* `modelVersion`: Active model serving traffic (e.g. `gbdt-risk-v1.0.0`).
* `featureVersion`: Active feature pipeline schema (e.g. `features-v1.0.0`).
* `riskProbability`: Calibrated model output \(\in [0.0, 1.0]\).
* `decision`: Deterministic policy verdict (`ALLOW` | `REVIEW` | `BLOCK`).
* `inferenceLatencyMs`: Realized server latency.
* `sanitizedFeatures`: Numeric feature vector without sensitive PII.

---

## 3. Human Reviewer Feedback Loop

Security analysts and compliance reviewers submit ground-truth feedback via `POST /api/v1/model-monitor/feedback`:
* `FRAUD`: Confirmed fraudulent attempt or chargeback.
* `LEGITIMATE`: Verified authentic customer transaction.
* `UNKNOWN`: Inconclusive or uncontactable user.

### Empirical Performance Metrics
When ground-truth labels are linked to prediction records, the system calculates:
* **Precision**: \(\frac{\text{TP}}{\text{TP} + \text{FP}}\)
* **Recall / Sensitivity**: \(\frac{\text{TP}}{\text{TP} + \text{FN}}\)
* **F1 Score**: \(\frac{2 \times \text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}\)
* **False Positive Rate (FPR)**: \(\frac{\text{FP}}{\text{TN} + \text{FP}}\)
* **False Negative Rate (FNR)**: \(\frac{\text{FN}}{\text{TP} + \text{FN}}\)
* **Empirical ROC-AUC**: Trapezoidal numerical integration.

---

## 4. Population Stability Index (PSI) Drift Monitoring

The monitoring service tracks feature distribution shift by computing standard Population Stability Index (PSI) against training reference baselines:
\[
\text{PSI} = \sum_{b=1}^{B} (P_b - Q_b) \times \ln\left(\frac{P_b + \epsilon}{Q_b + \epsilon}\right)
\]

| PSI Range | Drift Status | Governance Action |
| :--- | :--- | :--- |
| **\(\text{PSI} < 0.10\)** | `LOW / STABLE` | Normal operations. No action required. |
| **\(0.10 \le \text{PSI} < 0.25\)** | `MEDIUM / MODERATE` | Alert issued to model owners. Monitor fraud rate trends. |
| **\(\text{PSI} \ge 0.25\)** | `HIGH / SIGNIFICANT` | Model retraining recommended. Gatekeeper evaluation triggered. |

---

## 5. Safe Retraining & Model Promotion Protocol

> [!CAUTION]
> **Strict Governance Rule**: Retraining **never** automatically replaces the production model in serving memory.

### Gatekeeper Promotion Criteria
When candidate models are generated, they must pass three automated evaluation checks on the held-out test split:

1. **ROC-AUC Guardrail**:
   \[
   \text{ROC-AUC}_{\text{candidate}} \ge \text{ROC-AUC}_{\text{production}} - 0.01
   \]
2. **F1-Score Guardrail**:
   \[
   \text{F1}_{\text{candidate}} \ge \text{F1}_{\text{production}} - 0.01
   \]
3. **Financial Loss Mitigation Guardrail**:
   \[
   \text{ExpectedLoss}_{\text{candidate}} \le \text{ExpectedLoss}_{\text{production}} \times 1.05
   \]

### Promotion Lifecycle
```
[ Retraining Triggered ]
         │
         ▼
[ Candidate Model Evaluated on Held-Out Test Set ]
         │
         ├── Fails Gatekeeper Criteria ──► [ PROMOTION_REJECTED ] (Candidate Archived, Production Active)
         │
         └── Passes All 3 Criteria ──► [ PROMOTION_ELIGIBLE ] ──► [ Manual Authorized Promotion ]
```
