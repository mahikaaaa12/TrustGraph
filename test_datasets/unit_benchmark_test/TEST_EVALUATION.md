# TrustGraph Image Authenticity & AI Detection Evaluation Report

> **Evaluation Mode**: Empirical Ground-Truth Benchmark Evaluation  
> **Timestamp**: 2026-10-07T04:28:19.310Z  
> **Evaluated Model Version**: `1.0.0-onnx-mobilenet`  
> **Forensics Engine Version**: `forensics-multi-signal-v1`  
> **Preprocessing Spec**: sRGB Float32 224x224 (ImageNet Normalization)

---

## 1. Executive Summary & Benchmark Overview

This report documents the end-to-end empirical evaluation of the TrustGraph Image Authenticity Detection Pipeline. Evaluation was performed on a ground-truth dataset spanning **23 images** across four distinct categories: `REAL` (camera photos), `AI_GENERATED` (latent diffusion/generative model outputs), `MANIPULATED_REAL` (edited or recompressed photos), and `UNKNOWN/AMBIGUOUS` (web-stripped images).

> [!IMPORTANT]
> **Decoupled Evaluation Guard**: Filenames were sanitized during inference so that filename strings could not leak label metadata to the detector. Inference results reflect pure image content, EXIF metadata, ELA pixel anomalies, and trained neural network probabilities.

---

## 2. Key Performance Metrics Summary

| Metric | Score / Value | Target Benchmark Standard |
| :--- | :--- | :--- |
| **Overall Multi-Class Accuracy** | **26.1%** | ≥ 85.0% |
| **AI Detection Precision** | **100.0%** | ≥ 90.0% |
| **AI Detection Recall** | **28.6%** | ≥ 85.0% |
| **AI Detection F1-Score** | **0.4444** | ≥ 0.850 |
| **ROC-AUC (Receiver Operating Curve)** | **0.8571** | ≥ 0.900 |
| **PR-AUC (Precision-Recall Curve)** | **0.7425** | ≥ 0.900 |
| **Decision Threshold** | `0.55` | Configured |

---

## 3. Confusion Matrix (AI Detection Target)

- **Total Evaluated Samples**: 23
- **True Positives (TP)**: 2 (AI images correctly identified as AI)
- **True Negatives (TN)**: 16 (Non-AI images correctly identified as Non-AI)
- **False Positives (FP)**: 0 (Authentic/manipulated images falsely labeled AI)
- **False Negatives (FN)**: 5 (AI images missed by the detector)

```
                       PREDICTED AI        PREDICTED REAL/MANIP
ACTUAL AI              TP: ${cm.tp}               FN: ${cm.fn}
ACTUAL NON-AI          FP: ${cm.fp}               TN: ${cm.tn}
```

---

## 4. Confidence Score Distribution Analysis

Confidence probability histogram ($P(	ext{AI} mid 	ext{IMAGE})$) across test set:

| Score Range | Sample Count | Distribution |
| :--- | :--- | :--- |
| **0.0 - 0.2** (High Confidence Real) | 0 | High Real |
| **0.2 - 0.4** (Low Real / Unlikely) | 0 | Low Real |
| **0.4 - 0.6** (Ambiguous / Inconclusive) | 23 | Ambiguous |
| **0.6 - 0.8** (Suspicious / Likely AI) | 0 | Suspicious |
| **0.8 - 1.0** (High Confidence AI) | 0 | High AI |

- **Mean AI Probability**: `0.5142`
- **Median AI Probability**: `0.5075`
- **Std Deviation**: `0.0207`

---

## 5. Sub-Group Performance Slices

### Performance by File Format
| Format | Samples | Precision | Recall | F1-Score | Accuracy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| JPEG | 15 | 1 | 0.6667 | 0.8 | 93.3% |
| PNG | 6 | 1 | 0 | 0 | 50.0% |
| WEBP | 2 | 1 | 0 | 0 | 50.0% |

### Performance by Image Resolution
| Resolution Range | Samples | Precision | Recall | F1-Score | Accuracy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| high | 9 | 1 | 0.5 | 0.6667 | 88.9% |
| medium | 9 | 1 | 0 | 0 | 66.7% |
| low | 5 | 1 | 0.5 | 0.6667 | 80.0% |

### Performance by Perturbation Type
| Perturbation | Samples | Precision | Recall | F1-Score | Accuracy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| none | 10 | 1 | 0 | 0 | 70.0% |
| cropped | 3 | 1 | 1 | 1 | 100.0% |
| resized | 4 | 1 | 0 | 0 | 75.0% |
| compressed | 4 | 1 | 0 | 0 | 75.0% |
| screenshot | 2 | 1 | 1 | 1 | 100.0% |

---

## 6. Failure Cases Analysis

### False Positives (Falsely Labeled as AI)
| None | N/A | N/A | No false positives detected |

### False Negatives (AI Images Missed)
| SAMPLE_008 | AI_GENERATED | 52.1% | PNG / medium / none |
| SAMPLE_009 | AI_GENERATED | 52.3% | JPEG / medium / compressed |
| SAMPLE_010 | AI_GENERATED | 53.2% | PNG / low / none |
| SAMPLE_011 | AI_GENERATED | 46.1% | PNG / high / none |
| SAMPLE_012 | AI_GENERATED | 52.6% | WEBP / medium / resized |

---

## 7. System Limitations & Technical Recommendations

1. **Stripped Web Images**: When EXIF camera tags are stripped by web proxies, the system relies strictly on neural model features and latent resolution heuristics.
2. **Heavy JPEG Compression**: High compression ratios (JPEG quality < 40) can degrade neural feature activation maps.
3. **Continuous Model Updating**: As new generative model architectures emerge (e.g. FLUX, SD3, Sora stills), the ONNX classifier should be periodically fine-tuned and re-evaluated using this benchmark suite.

---

## 8. Reproducibility

This benchmark can be executed reproducibly with a single command:

```bash
npm run benchmark:image
```
