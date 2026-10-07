# TrustGraph Image Authenticity & AI Detection Evaluation Report

> **Evaluation Mode**: Empirical Ground-Truth Benchmark Evaluation  
> **Timestamp**: 2026-10-07T13:59:27.771Z  
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
| **Overall Multi-Class Accuracy** | **47.8%** | ≥ 85.0% |
| **AI Detection Precision** | **100.0%** | ≥ 90.0% |
| **AI Detection Recall** | **100.0%** | ≥ 85.0% |
| **AI Detection F1-Score** | **1** | ≥ 0.850 |
| **ROC-AUC (Receiver Operating Curve)** | **1** | ≥ 0.900 |
| **PR-AUC (Precision-Recall Curve)** | **0.6522** | ≥ 0.900 |
| **Decision Threshold** | `0.55` | Configured |

---

## 3. Confusion Matrix (AI Detection Target)

- **Total Evaluated Samples**: 23
- **True Positives (TP)**: 7 (AI images correctly identified as AI)
- **True Negatives (TN)**: 16 (Non-AI images correctly identified as Non-AI)
- **False Positives (FP)**: 0 (Authentic/manipulated images falsely labeled AI)
- **False Negatives (FN)**: 0 (AI images missed by the detector)

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
| **0.4 - 0.6** (Ambiguous / Inconclusive) | 16 | Ambiguous |
| **0.6 - 0.8** (Suspicious / Likely AI) | 0 | Suspicious |
| **0.8 - 1.0** (High Confidence AI) | 7 | High AI |

- **Mean AI Probability**: `0.6426`
- **Median AI Probability**: `0.5075`
- **Std Deviation**: `0.2033`

---

## 5. Sub-Group Performance Slices

### Performance by File Format
| Format | Samples | Precision | Recall | F1-Score | Accuracy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| JPEG | 15 | 1 | 1 | 1 | 100.0% |
| PNG | 6 | 1 | 1 | 1 | 100.0% |
| WEBP | 2 | 1 | 1 | 1 | 100.0% |

### Performance by Image Resolution
| Resolution Range | Samples | Precision | Recall | F1-Score | Accuracy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| high | 9 | 1 | 1 | 1 | 100.0% |
| medium | 9 | 1 | 1 | 1 | 100.0% |
| low | 5 | 1 | 1 | 1 | 100.0% |

### Performance by Perturbation Type
| Perturbation | Samples | Precision | Recall | F1-Score | Accuracy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| none | 10 | 1 | 1 | 1 | 100.0% |
| cropped | 3 | 1 | 1 | 1 | 100.0% |
| resized | 4 | 1 | 1 | 1 | 100.0% |
| compressed | 4 | 1 | 1 | 1 | 100.0% |
| screenshot | 2 | 1 | 1 | 1 | 100.0% |

---

## 6. Failure Cases Analysis

### False Positives (Falsely Labeled as AI)
| None | N/A | N/A | No false positives detected |

### False Negatives (AI Images Missed)
| None | N/A | N/A | No false negatives detected |

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
