# TrustGraph Image AI Model Forensic Validation Report

**Document Date:** October 7, 2026  
**Artifact Evaluated:** `src/ml/artifacts/ai_image_detector.onnx` (`1.0.0-onnx-mobilenet`)  
**Evaluation Scope:** Model Architecture, Preprocessing Pipeline, Calibration, Direct vs. Pipeline Inference, Benchmark Performance, and Retraining Assessment.  
**Constraint:** Strict Validation Only — Zero changes to production code, scoring, thresholds, or model weights.

---

## 1. Model Architecture

| Parameter | Specification | Verification Method |
| :--- | :--- | :--- |
| **Model Type** | MobileNet-V3 Small (`torchvision.models.mobilenet_v3_small`) | Verified via ONNX graph inspection (`HardSwish`, `HardSigmoid`, `Conv`, `GlobalAveragePool`) |
| **Input Node** | Name: `input`, Shape: `['batch_size', 3, 224, 224]`, Type: `Float32` | Verified via `onnx.load()` and `onnxruntime.InferenceSession.get_inputs()` |
| **Output Node** | Name: `output`, Shape: `['batch_size', 2]`, Type: `Float32` (Raw Logits) | Verified via `onnxruntime.InferenceSession.get_outputs()` |
| **Classification Head** | `Linear(in_features=1024, out_features=2)` | Weight tensor `backbone.classifier.3.weight` shape: `[2, 1024]` |
| **Feature Extractor** | Inverted Residual Blocks (576 bottleneck channels to 1024 projection) | `backbone.classifier.0.weight` shape: `[1024, 576]` |
| **Total Weight Tensors** | 108 initializers | Verified |
| **ONNX Opset** | Opset 14, IR Version 7 | Exported with PyTorch 2.13.0 |

---

## 2. Input Requirements & Tensor Shape

The ONNX execution graph enforces exact numerical and dimensional constraints:
- **Batch Dimension**: Dynamic batch size supported (`'batch_size'`), production runtime invokes batch size $N = 1$.
- **Tensor Layout**: NCHW format: `[1, 3, 224, 224]`.
- **Data Type**: 32-bit floating point (`Float32` / `float32`).
- **Value Domain**: Normalized ImageNet zero-centered distribution, approximately $[-2.12, +2.64]$.

---

## 3. Preprocessing & Color Pipeline

The inference preprocessing in [`src/services/aiImageDetector.service.js`](file:///d:/Projects/TrustGraph/src/services/aiImageDetector.service.js#L38-L64) was audited against the PyTorch training pipeline in [`ml/image_ai/preprocessing/transforms.py`](file:///d:/Projects/TrustGraph/ml/image_ai/preprocessing/transforms.py):

```
Raw Image Buffer (JPEG / PNG / WebP)
  ↓ sharp(imageBuffer)
  ├── .resize(224, 224, { fit: 'fill' })       [Exact pixel bounding box, no letterboxing]
  ├── .removeAlpha()                           [Strips 4th RGBA channel]
  ├── .toColourspace('srgb')                   [Converts all formats/CMYK to standard sRGB]
  └── .raw().toBuffer()                        [Interleaved Uint8Array: R, G, B, R, G, B, ...]
  ↓ Preprocessing Tensor Construction (Float32Array of size 3 × 224 × 224 = 150,528 floats)
  ├── Channel 0 (Red):   (R / 255.0 - 0.485) / 0.229
  ├── Channel 1 (Green): (G / 255.0 - 0.456) / 0.224
  └── Channel 2 (Blue):  (B / 255.0 - 0.406) / 0.225
  ↓
  NCHW Float32 Tensor fed to ONNX Runtime
```

### Verification Findings:
1. **RGB vs. BGR Handling**: Sharp outputs standard sRGB channel ordering (`[R, G, B]`). The channel indexing correctly populates Channel 0 with Red, Channel 1 with Green, and Channel 2 with Blue. There is **no BGR inversion defect**.
2. **Aspect Ratio / Resize**: Sharp uses `{ fit: 'fill' }`, scaling both axes directly to $224 \times 224$. This matches torchvision `transforms.Resize((224, 224))` without cropping.
3. **Normalization Constants**: Mean $\mu = [0.485, 0.456, 0.406]$ and std $\sigma = [0.229, 0.224, 0.225]$ perfectly mirror standard ImageNet statistics used during transfer learning.

---

## 4. Class Mapping & Softmax Interpretation

The classification output semantics:
- **Output Tensor**: 2 unnormalized logits: `[logit_0, logit_1]`.
- **Class Index 0**: `REAL`
- **Class Index 1**: `AI_GENERATED`
- **Mathematical Interpretation**:
  $$P(\text{REAL}) = \frac{e^{\text{logit}_0 - \max}}{\sum_j e^{\text{logit}_j - \max}}, \quad P(\text{AI}) = \frac{e^{\text{logit}_1 - \max}}{\sum_j e^{\text{logit}_j - \max}}$$
- **Confidence**: Defined in runtime as $|P(\text{AI}) - P(\text{REAL})|$.
- **Decision Thresholds**:
  - $P(\text{AI}) \ge 0.75 \rightarrow$ `LIKELY_AI_GENERATED`
  - $0.55 \le P(\text{AI}) < 0.75 \rightarrow$ `SUSPICIOUS`
  - $0.25 < P(\text{AI}) < 0.55 \rightarrow$ `INCONCLUSIVE`
  - $P(\text{AI}) \le 0.25 \rightarrow$ `LIKELY_REAL`
  - Production binary classification decision boundary: $\tau = 0.55$.

---

## 5. Dataset Audit: Available vs. Required

### Currently Available in Repository:
1. `test_datasets/image_benchmark/manifest.json`: **23 labeled test samples** (with actual image files in `images/`):
   - `REAL`: 7 samples (JPEG, PNG across High/Med resolutions, clean/cropped/compressed)
   - `AI_GENERATED`: 7 samples (PNG, JPEG, WebP across High/Med/Low resolutions, screenshot/cropped/compressed)
   - `MANIPULATED_REAL`: 5 samples (JPEG, PNG, modified real images)
   - `UNKNOWN/AMBIGUOUS`: 4 samples (WebP, PNG, JPEG, low-resolution unverified web images)
2. `src/uploads`: **113 ad-hoc test images** (including user-uploaded test cases like `Alpine_Sunrise_and_Cozy_Coffee`, `ChatGPT_Hospital_ERFlow`, and `passphoto`).
3. `ml/image_ai/dataset_raw`: **DOES NOT EXIST** (`0` samples, status: `DATASET_NOT_FOUND`).

### Required for Production-Grade Model Retraining:
As formally specified in [`ml/image_ai/output/dataset_specification_required.json`](file:///d:/Projects/TrustGraph/ml/image_ai/output/dataset_specification_required.json):
- Minimum **5,000 to 10,000 diverse images per class** (total $\ge 15,000$ images).
- Balanced generator sources: Midjourney v5/v6, DALL-E 3, Stable Diffusion XL, Flux, Leonardo.ai, Ideogram, and Adobe Firefly.
- Balanced camera sources: Full-frame DSLRs (Canon, Nikon, Sony), smartphones (iPhone, Samsung Galaxy, Google Pixel), web compressed social media photos (Instagram, WhatsApp).
- Resolution spectrum: $512 \times 512$ up to $4000 \times 3000$ with diverse JPEG quality compression ($Q \in [65, 95]$).

---

## 6. Quantitative Evaluation Metrics

Evaluation of the raw MobileNet-V3 ONNX model against the ground-truth labeled benchmark dataset:

### A. Binary Ground-Truth Subset (14 Samples: 7 REAL vs. 7 AI_GENERATED)

| Metric | Threshold $\tau = 0.55$ (Production Standard) | Threshold $\tau = 0.50$ (Uncalibrated Argmax) |
| :--- | :---: | :---: |
| **Total Samples** | 14 | 14 |
| **REAL Samples** | 7 | 7 |
| **AI_GENERATED Samples** | 7 | 7 |
| **Accuracy** | **64.29%** | **42.86%** |
| **Precision** | **1.0000 (100.0%)** | **0.4615 (46.15%)** |
| **Recall** | **0.2857 (28.57%)** | **0.8571 (85.71%)** |
| **F1-Score** | **0.4444** | **0.6000** |
| **ROC-AUC** | **0.8571** | **0.8571** |
| **PR-AUC** | **0.9258** | **0.9258** |
| **False-Positive Rate (FPR)** | **0.0000 (0.0%)** | **1.0000 (100.0%)** |
| **False-Negative Rate (FNR)** | **0.7143 (71.43%)** | **0.1429 (14.29%)** |

#### Breakdown at $\tau = 0.55$:
- `REAL` $\rightarrow$ predicted `REAL` (TN): **7 / 7 (100%)**
- `REAL` $\rightarrow$ predicted `AI` (FP): **0 / 7 (0%)**
- `AI` $\rightarrow$ predicted `AI` (TP): **2 / 7 (28.57%)**
- `AI` $\rightarrow$ predicted `REAL` (FN): **5 / 7 (71.43%)**

---

### B. Complete Benchmark Dataset (23 Samples: 7 AI_GENERATED vs. 16 Non-AI)

| Metric | Threshold $\tau = 0.55$ (Production Standard) | Threshold $\tau = 0.50$ (Uncalibrated Argmax) |
| :--- | :---: | :---: |
| **Total Samples** | 23 | 23 |
| **Non-AI (REAL / Manip / Ambig)** | 16 | 16 |
| **AI_GENERATED Samples** | 7 | 7 |
| **Accuracy** | **78.26%** | **26.09%** |
| **Precision** | **1.0000 (100.0%)** | **0.2727 (27.27%)** |
| **Recall** | **0.2857 (28.57%)** | **0.8571 (85.71%)** |
| **F1-Score** | **0.4444** | **0.4138** |
| **ROC-AUC** | **0.8571** | **0.8571** |
| **PR-AUC** | **0.8984** | **0.8984** |
| **False-Positive Rate (FPR)** | **0.0000 (0.0%)** | **1.0000 (100.0%)** |
| **False-Negative Rate (FNR)** | **0.7143 (71.43%)** | **0.1429 (14.29%)** |

#### Breakdown at $\tau = 0.55$:
- Non-AI $\rightarrow$ predicted Non-AI (TN): **16 / 16 (100%)**
- Non-AI $\rightarrow$ predicted AI (FP): **0 / 16 (0%)**
- AI $\rightarrow$ predicted AI (TP): **2 / 7 (28.57%)**
- AI $\rightarrow$ predicted Non-AI (FN): **5 / 7 (71.43%)**

---

## 7. Confusion Matrices

### Confusion Matrix at $\tau = 0.55$ (Production Threshold):
```
                       Predicted REAL / Non-AI      Predicted AI_GENERATED
Actual REAL / Non-AI            16 (TN)                     0 (FP)
Actual AI_GENERATED              5 (FN)                     2 (TP)
```

### Confusion Matrix at $\tau = 0.50$ (Uncalibrated 50/50 Threshold):
```
                       Predicted REAL / Non-AI      Predicted AI_GENERATED
Actual REAL / Non-AI             0 (TN)                    16 (FP)
Actual AI_GENERATED              1 (FN)                     6 (TP)
```

---

## 8. Error Analysis: False Positives & False Negatives

### False Positives (FP):
- **At $\tau = 0.55$**: **0 False Positives**. The model produced zero false alarms across all authentic photos, camera crops, and ambiguous images.
- **At $\tau = 0.50$**: **16 False Positives (100% FPR)**. Because the model's logits have an uncalibrated positive offset ($\text{logit}_1 - \text{logit}_0 \approx +0.03$), nearly all natural images yield $P(\text{AI}) \in [0.5058, 0.5075]$, causing catastrophic false-positive failure if evaluated at $0.50$.

### False Negatives (FN at $\tau = 0.55$):
The 5 synthetic images missed by the direct neural classifier alone:
1. `SAMPLE_008` (PNG, 1024×1024): $P(\text{AI}) = 0.5206$ (Classified `INCONCLUSIVE`)
2. `SAMPLE_009` (JPEG, 1024×1024, compressed): $P(\text{AI}) = 0.5229$ (Classified `INCONCLUSIVE`)
3. `SAMPLE_010` (PNG, 512×512): $P(\text{AI}) = 0.5316$ (Classified `INCONCLUSIVE`)
4. `SAMPLE_011` (PNG, 1024×1792): $P(\text{AI}) = 0.4614$ (Classified `INCONCLUSIVE` — inverted prediction)
5. `SAMPLE_012` (WebP, 1024×1024, resized): $P(\text{AI}) = 0.5260$ (Classified `INCONCLUSIVE`)

**Key Diagnostic Finding**: All 5 false negatives produce probabilities in the narrow band $[0.46, 0.53]$. The model is suffering from **logit squashing / extreme uncertainty**.

---

## 9. Production-vs-Direct Inference Comparison

We ran known manual test images uploaded by the user through all three layers of the production stack to compare consistency:

| Image Description | File Type / Size | Direct Model Output (`AIImageDetector`) | Image Service Output (`ImageService`) | Creator Service Output (`CreatorService`) | Consistency Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Alpine Sunrise and Cozy Coffee** | Known AI image (2.55 MB PNG) | $P(\text{AI}) = 0.4287$, $P(\text{Real}) = 0.5713$, Class: `INCONCLUSIVE` (Logits: `[-0.27, -0.56]`) | AI Assessment: `LIKELY_AI_GENERATED`, Likelihood: `0.95`, Signals: `['ai_software_signature', 'resolution_heuristic']`, Trust: `38` | Trust Score: `35`, AI Signal: `High`, Authenticity: `Low`, Forensics: `AI Generated` | **Consistent across pipeline layers** |
| **ChatGPT ERFlow Hospital** | Known AI image (1.32 MB PNG) | $P(\text{AI}) = 0.4941$, $P(\text{Real}) = 0.5059$, Class: `INCONCLUSIVE` (Logits: `[0.24, 0.22]`) | AI Assessment: `LIKELY_AI_GENERATED`, Likelihood: `0.95`, Signals: `['ai_software_signature', 'resolution_heuristic']`, Trust: `38` | Trust Score: `35`, AI Signal: `High`, Authenticity: `Low`, Forensics: `AI Generated` | **Consistent across pipeline layers** |
| **ChatGPT Image (Aug 15)** | Known AI image (1.89 MB PNG) | $P(\text{AI}) = 0.4311$, $P(\text{Real}) = 0.5689$, Class: `INCONCLUSIVE` (Logits: `[0.28, 0.00]`) | AI Assessment: `LIKELY_AI_GENERATED`, Likelihood: `0.95`, Signals: `['ai_software_signature', 'resolution_heuristic']`, Trust: `38` | Trust Score: `35`, AI Signal: `High`, Authenticity: `Low`, Forensics: `AI Generated` | **Consistent across pipeline layers** |
| **Authentic Passport Photo** | Real camera portrait (31 KB JPEG) | $P(\text{AI}) = 0.3397$, $P(\text{Real}) = 0.6603$, Class: `INCONCLUSIVE` (Logits: `[0.22, -0.44]`) | AI Assessment: `INCONCLUSIVE`, Likelihood: `0.3397`, Signals: `['neural_ai_classifier']`, Trust: `95` | Trust Score: `95`, AI Signal: `Inconclusive`, Authenticity: `Medium`, Forensics: `Original` | **Consistent across pipeline layers** |
| **Screenshot 340** | Real desktop screen capture (906 KB PNG) | $P(\text{AI}) = 0.3914$, $P(\text{Real}) = 0.6086$, Class: `INCONCLUSIVE` (Logits: `[0.05, -0.39]`) | AI Assessment: `INCONCLUSIVE`, Likelihood: `0.3914`, Signals: `['neural_ai_classifier']`, Trust: `95` | Trust Score: `95`, AI Signal: `Inconclusive`, Authenticity: `Medium`, Forensics: `Original` | **Consistent across pipeline layers** |

### Analysis of the Comparison:
1. **Value Consistency**: The raw ONNX model outputs identical logits and probabilities regardless of whether invoked directly via Python/Node or within the [`ImageService`](file:///d:/Projects/TrustGraph/src/services/image.service.js) execution path.
2. **Forensic Aggregator Role**: In production, [`ImageService`](file:///d:/Projects/TrustGraph/src/services/image.service.js) correctly augments the weak neural detector. When `Alpine Sunrise` or `ChatGPT Hospital` is analyzed, the **C2PA / PNG software chunk scanner** successfully identifies the generator metadata signature (`ai_software_signature`), elevating the synthetic likelihood to `0.95` and overriding the weak model prediction.
3. **Decoupling Integrity**: The neural classifier's own internal probabilities (`aiProb: 0.4287`, `realProb: 0.5713`) are cleanly preserved under `aiModelDetector` and are never artificially inflated, maintaining strict telemetry separation.

---

## 10. Current Model Limitations

1. **Severe Logit Compression**: All evaluated images produce raw logits in the narrow range $[-0.5, +0.3]$. After Softmax, probabilities are squished into $[0.33, 0.57]$. The model lacks predictive dynamic range.
2. **Probability Bias on Backgrounds**: Clean SVG/synthetic gradients and raw photo backgrounds consistently trigger an artificial $+0.02$ to $+0.04$ logit advantage toward `AI_GENERATED`, making uncalibrated argmax ($\tau = 0.50$) unusable.
3. **Low Recall on AI Images**: At the safe threshold $\tau = 0.55$, recall is only $28.57\%$. The neural network alone detects only 2 of 7 AI images.
4. **Resolution Fragility**: Portrait aspect ratio image `SAMPLE_011` ($1024 \times 1792$) experienced classification inversion ($P(\text{AI}) = 0.4614$) when squashed to $224 \times 224$.

---

## 11. Is Retraining Actually Necessary?

### Assessment: **YES, Retraining is Necessary.**

#### Technical Justification:
1. **Model Suffers from Under-Training / Synthetic Domain Gap**: The current MobileNet-V3 artifact was trained on an insufficiently diverse or heavily synthesized initial dataset without hard negatives. It functions more like a weak prior than a confident classifier.
2. **Production Currently Relies on Forensics**: TrustGraph currently detects AI images primarily through metadata chunks, C2PA signatures, and resolution heuristics in [`ImageService`](file:///d:/Projects/TrustGraph/src/services/image.service.js). If an AI image has its metadata stripped (e.g. uploaded via Twitter or WhatsApp), the current ONNX model will output $P(\text{AI}) \approx 0.45 - 0.52$, resulting in an `INCONCLUSIVE` rating.
3. **Prerequisite Before Retraining**:
   - Retraining **must not be attempted** until a legitimate, diverse dataset of $\ge 10,000$ images (balanced across modern generators and camera sensors) is curated into `ml/image_ai/dataset_raw/`.
   - Attempting to retrain on small or synthetic datasets will degrade the model further.
   - Temperature scaling / Platt calibration should be fitted to the trained checkpoint before ONNX export to expand the logit dynamic range.

---

## 12. Summary Matrix

```
┌─────────────────────────────────┬────────────────────────────────────────────┐
│ Audit Dimension                 │ Status & Findings                          │
├─────────────────────────────────┼────────────────────────────────────────────┤
│ Model Backbone                  │ MobileNet-V3 Small (PyTorch Opset 14)       │
│ Tensor Input                    │ [1, 3, 224, 224] Float32 NCHW              │
│ Normalization & Color           │ Verified: ImageNet stats, Strict RGB       │
│ Class Ordering                  │ Index 0: REAL, Index 1: AI_GENERATED       │
│ Direct Model ROC-AUC            │ 0.8571 (Good ranking ability)              │
│ Direct Model Recall (at 0.55)   │ 28.57% (Severely under-sensitive)          │
│ Direct Model Precision (at 0.55)│ 100.0% (Zero false positives at 0.55)      │
│ Direct Model at 0.50 threshold  │ Fails (100% FPR due to logit bias)         │
│ Production Layer Consistency    │ Verified: Model, Service, Creator aligned  │
│ Need for Model Retraining       │ YES (Once dataset of ≥10k images is ready) │
└─────────────────────────────────┴────────────────────────────────────────────┘
```
