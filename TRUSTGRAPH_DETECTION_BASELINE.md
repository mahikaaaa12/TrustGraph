# TrustGraph Detection Baseline Audit Report

> **Forensic System Baseline & Architecture Integrity Audit**  
> **Status:** Read-Only Audit Complete (Zero Code Modifications)  
> **Target Revision:** Baseline Truth Verification

---

## 1. Master Detection Architecture Matrix

| Domain | Detector | ML/Rule/Heuristic | Input | Output | Score | Confidence | Model |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Image** | `AIImageDetector` | ML (ONNX) | Image Buffer (raw bytes / `Float32Array[1,3,224,224]`) | `aiGeneratedProbability`, `realImageProbability`, `classification` | Logit Softmax probability `[0.0, 1.0]` | `\|p_ai - p_real\|` `[0.0, 1.0]` | MobileNet-V3 / ONNX (`ai_image_detector.onnx`) |
| **Image** | Metadata Forensics | Rule / Heuristic | EXIF Object, Buffer | `hasCameraHardware`, software tags, C2PA claims, generator markers | `+0.95` (tool tag), `-0.20` (hardware), `+0.30` (1024x1024) | `0.70 - 0.99` | None (Rule-based) |
| **Image** | Error Level Analysis (ELA) | Heuristic | File Buffer (JPEG recompression 75%) | Mean compression error, peak error, heatmap file | `0 - 100` manipulation score | `0.65 - 0.90` | None (Image diff) |
| **Document** | Text Extraction & Metadata | Heuristic | PDF / DOCX byte buffer (`pdf-parse`, `mammoth`) | Plaintext, page count, PDF author/producer, creationDate | N/A | High (`1.0` if parsed) | None |
| **Document** | `AiGenerationDetector` | Rule / Heuristic | Extracted document text string | `likelihood`, `detected`, `classification`, `signals` | `0.0 - 0.95` (`Math.max(0.75)` for synthetic phrases) | `0.65 - 0.88` | None (Regex + word variance) |
| **Document** | PII / Sensitive Information | Rule (Regex) | Extracted document text string | Detected leaks (SSN, CC, emails, API keys) | `riskScore += 15 - 30` per leak | `0.90 - 0.95` | None (Regex) |
| **Document** | Security & Tampering | Rule / Heuristic | Metadata tags, incremental update count | `riskScore`, `trustScore`, security findings | `trustScore = 100 - riskScore` | `0.80 - 0.95` | None (Rule-based) |
| **Text** | `AiGenerationDetector` | Rule / Heuristic | Raw text string | `likelihood`, `detected`, `classification`, `signals` | `0.0 - 0.95` (`+0.40` disclaimers, `+0.25` stylometry) | `0.65 - 0.88` | None (Regex + stylometry) |
| **Text** | Social Engineering Detector | Rule (Regex) | Raw text string | `urgencyMatches`, `credentialMatches`, `likelihood` | `0.0 - 0.92` (`75` pts urgency+creds) | `0.65 - 0.92` | None (Regex) |
| **Text** | Sentiment Engine | Rule (Lexicon) | Raw text string | `sentiment`, `compoundScore` (`[-1.0, 1.0]`), counts | Compound score `[-1.0, 1.0]` | Rule-based | None (VADER-style lexicon) |
| **Text** | Fake News & Sensationalism | Heuristic (Regex) | Raw text string | `fakeNewsProbability`, `clickbaitMatches`, `allCapsCount` | `0.02 - 0.98` | Heuristic | None (Regex) |
| **Website** | SSRF Validator | Rule (Network) | Hostname / IPv4 / IPv6 string | `isSafe`, `resolvedIps`, error | Boolean Gate | `1.0` | None (IP Range Check) |
| **Website** | TLS/SSL Inspector | Rule (Network) | Target Hostname, Port (443) | `hasSsl`, `isAuthorized`, `isExpired`, `daysRemaining` | `95` (>180d), `85` (<180d), `30` (invalid) | `0.95` (Live TLS) | None (Node TLS stack) |
| **Website** | DNS Telemetry | Rule (Network) | Target Hostname | `ipAddresses`, `mxRecordsCount`, `hasSpfRecord` | High Risk if zero MX/SPF | `0.92` (Live DNS) | None (Node DNS resolver) |
| **Website** | Phishing Pattern Scanner | Heuristic | Target URL path, hostname, SSL info | `likelihood`, `isLikelyPhishing` | `0.0 - 1.0` (IP: `+0.35`, brand words: `+0.15`) | `0.85` | None (Heuristic) |
| **Website** | Evidence Verdict Synthesizer | Rule | Array of structured evidence items | Verdict (`SAFE`, `REVIEW`, `HIGH_RISK`, `INCONCLUSIVE`) | `10.0 - 95.0` Trust Score | `0.90` | None (Deterministic Policy) |
| **Transaction** | `RiskEngineService` | ML (GBDT) | 16 Scaled features (velocity, amount, IP risk, etc.) | Raw Logit, Probability, Feature Attributions | Calibrated Fraud Prob `[0.0, 1.0]` | `\|p - 0.5\| * 2` `[0.0, 1.0]` | LightGBM/GBDT (`gbdt-risk-v1.json`) |
| **Transaction** | `RiskEngineService` | ML (LogReg) | 16 Standardized features | Logit, Probability, Feature Contributions | Calibrated Fraud Prob `[0.0, 1.0]` | `\|p - 0.5\| * 2` `[0.0, 1.0]` | Logistic Regression (`logreg-risk-v1.json`) |
| **Transaction** | `FraudModel` | ML (LogReg) | 12 Standardized telemetry features | `fraudProbability`, `trustScore`, `riskTier` | Sigmoid probability `[0.0, 1.0]` | Hardcoded thresholds | Logistic Regression (`modelWeights.json`) |
| **Transaction** | Policy Engine | Rule (Deterministic) | Features, amount, ML prob, graph cycle count | Decision (`ALLOW`, `REVIEW`, `BLOCK`), triggered policy | Deterministic Block / Review | `1.0` | None (Policy Table) |
| **Graph** | Relational Clustering | Graph Heuristic | Adjacency graph (Entities, Devices, IPs, Cards) | `clusterSize`, `sharedDeviceAccounts`, `sharedIpAccounts` | `+15` / shared device, `+10` / shared IP | `0.95` (Graph Topology) | None (Adjacency traversal) |
| **Graph** | Cycle & Collusion Detector | Graph Algorithm | Directed transaction edges | `cycles`, `isCyclicCollusion`, `cycleCount` | `+35` risk points if cycle found | `1.0` (Exact Cycle Detection) | None (DFS / Tarjan) |
| **Aggregation** | `CreatorService` | Multi-Modal Pipeline | Package Payload (image, caption, link, doc, IG) | `contentTrustScore`, `authenticity`, `security`, `aiSignal` | Composite Trust Score `[0 - 100]` | `0.65 - 0.95` | Composite Orchestrator |
| **Aggregation** | `TrustScoreService` | Composite Synthesizer | Modal Scores (Image, Doc, Web, Text), Amount | `overallTrustScore`, `confidenceScore`, `breakdown` | Weighted composite `[0.0, 100.0]` | Variance-adjusted `[0.10, 0.99]` | Composite (ML + Rules) |

---

## 2. Pipeline-by-Pipeline Detailed Architecture

### A. IMAGE PIPELINE
- **Route:** `POST /api/v1/images/analyze`
- **Controller:** `src/controllers/image.controller.js` (`analyzeImage`)
- **Service:** `src/services/image.service.js` (`ImageService.analyzeImage`)
- **Detectors:**
  1. `AIImageDetector.detect(fileBuffer)`: Primary ML classifier using ONNX Runtime (MobileNet-V3 architecture; fallback to Python subprocess).
  2. `ImageService.detectAiGeneratedImage(exifData, sharpMeta, fileBuffer)`: Rule/heuristic checks for EXIF camera sensor tags, standard AI resolutions (1024x1024, etc.), C2PA buffer tags, software watermarks.
  3. `ImageService.detectImageManipulation(exifData, sharpMeta, elaResults)`: Sharp ELA recompression delta (quality 75) + software traces.
  4. `ImageService.detectProvenance(exifData, sharpMeta, fileBuffer)`: C2PA signature presence + camera sensor telemetry.
- **Model:** `src/ml/artifacts/ai_image_detector.onnx` (`1.0.0-onnx-mobilenet`).
- **Input:** Multipart image upload buffer (JPG, PNG, WEBP), file metadata.
- **Output:** `aiModelDetector`, `aiGenerationAssessment`, `manipulationAssessment`, `provenanceAssessment`, `errorLevelAnalysis`, `overallTrustScore`, `confidenceScore`, `evidences`.
- **Score:** `trustScore = 100 - (aiLikelihood * 60) - 10 (if model >= 0.65) - (manipLikelihood * 25) - ...`
- **Confidence:** `0.99` if forensic markers detected; else model confidence `|p_ai - p_real|`.
- **Thresholds:**
  - AI Generation: `LIKELY_AI_GENERATED` ($\ge 0.75$), `SUSPICIOUS` ($\ge 0.55$), `UNLIKELY` ($\le 0.25$).
- **Fallbacks:**
  - If ONNX model missing: Returns `detectorStatus: 'MODEL_UNAVAILABLE'` with `null` probabilities; `ImageService` falls back gracefully to metadata heuristics alone.
  - If Node `onnxruntime-node` binary fails: Falls back to Python runner executing `onnxruntime`.
- **Frontend Transformation:** `client/src/pages/ImagePage.jsx` renders score gauge, AI badge, Manipulation badge, and ELA heatmap view.

---

### B. DOCUMENT PIPELINE
- **Route:** `POST /api/v1/documents/analyze`
- **Controller:** `src/controllers/document.controller.js` (`analyzeDocument`)
- **Service:** `src/services/document.service.js` (`DocumentService.analyzeDocument`)
- **Detectors:**
  1. `DocumentService.extractTextAndMetadata`: Parser via `pdf-parse` (PDF) and `mammoth` (DOCX).
  2. `AiGenerationDetector.detectAiGeneration`: Regex heuristics, stylometric sentence length variance, and synthetic content declarations.
  3. `DocumentService.detectSensitiveInformation`: Regex matching for SSN, credit cards, emails, phone numbers, API keys.
  4. `DocumentService.evaluateDocumentRisk`: Risk accumulator (+15 AI, +30 SSN/CC, +10 unencrypted, +10 stripped metadata).
- **Model:** None (Rule and Regex based).
- **Input:** Document `fileId` (MongoDB `UploadedFile` record).
- **Output:** `extractedText`, `metadata`, `sensitiveInfo`, `aiAssessment`, `riskAssessment`, `trustScore`, `confidenceScore`.
- **Score:** `trustScore = Math.max(0, 100 - riskScore)`.
- **Confidence:** `0.85 - 0.95`.
- **Thresholds:** Risk level: `CRITICAL` ($\ge 60$), `HIGH` ($\ge 35$), `MEDIUM` ($\ge 20$), `LOW` ($< 20$).
- **Critical Flaw:**
  - In `src/services/creator.service.js` lines 288, 831, 1062: CreatorService calls `DocumentService.evaluateDocumentSecurity(fileId, userId)`. **This method does not exist on DocumentService** (the real method is `analyzeDocument`). It immediately throws a `TypeError`, gets caught, and defaults `documentScore = 75`!

---

### C. TEXT PIPELINE
- **Route:** `POST /api/v1/texts/analyze`
- **Controller:** `src/controllers/text.controller.js` (`analyzeText`)
- **Service:** `src/services/text.service.js` (`TextService.analyzeText`)
- **Detectors:**
  1. `AiGenerationDetector.detectAiGeneration`: Regex patterns for AI self-disclosure disclaimers + stylometric sentence variance.
  2. `TextService.detectSocialEngineering`: Urgent threat phrasing + credential request regex patterns.
  3. `TextService.analyzeSentiment`: Lexicon-based VADER style positive/negative token counter.
  4. `TextService.detectFakeNewsProbability`: Clickbait regex patterns + all-caps counter.
  5. `TextService.calculateTextSimilarity`: Bag-of-words cosine similarity.
- **Model:** None (Heuristic and Regex engines).
- **Input:** Raw UTF-8 text string, optional benchmark text string.
- **Output:** `aiGenerationAssessment`, `socialEngineeringAssessment`, `sentiment`, `fakeNewsDetection`, `overallTrustScore`, `confidenceScore`, `riskCategory`.
- **Score:** `trustScore = 100 - (aiLikelihood * 20) - (socialEngLikelihood * 45) - (fakeNewsProb * 20)`.
- **Confidence:** Hardcoded average: `(aiAssessment.confidence * 0.5 + socialEngAssessment.confidence * 0.5)`.
- **Critical Flaw:**
  - `burstinessScore` is hardcoded to `65.0` (line 374).
  - `perplexityScore` is hardcoded to `Math.round(100 - aiAssessment.likelihood * 80)` (line 373).

---

### D. WEBSITE PIPELINE
- **Route:** `POST /api/v1/websites/analyze`
- **Controller:** `src/controllers/website.controller.js` (`analyzeWebsite`)
- **Service:** `src/services/website.service.js` (`WebsiteService.analyzeWebsite`)
- **Detectors:**
  1. `SsrfValidator.validateHostname`: Prevents SSRF to internal/cloud metadata networks (RFC 1918, 127.0.0.1, 169.254.169.254).
  2. `WebsiteService.inspectSslCertificate`: Node `tls.connect` live handshake (validity, days remaining, authorized status).
  3. `WebsiteService.inspectDnsAndDomain`: Node `dns.promises.resolve4`, `resolveMx`, `resolveTxt` (SPF validation).
  4. `WebsiteService.analyzePhishingRisk`: IP-in-hostname, brand name keyword paths, absent MX records.
  5. `WebsiteService.synthesizeVerdict`: Structured evidence aggregator determining verdict (`SAFE`, `REVIEW`, `HIGH_RISK`, `INCONCLUSIVE`).
- **Model:** None (Network inspection + Rule-based Evidence Framework).
- **Input:** Target URL string.
- **Output:** `verdict`, `trustScore`, `riskCategory`, `sslCertificate`, `domainAnalysis`, `phishingRisk`, `evidences`.
- **Score:** Safe: `95.0`; Review: `95 - highRisk*25 - review*15` (min 45); High Risk: `95 - highRisk*35 - review*15` (min 10); Inconclusive: `40.0`.
- **Confidence:** `0.85 - 0.95`.
- **Fallbacks:** Sockets timeout at 5000ms; DNS errors produce `INCONCLUSIVE` verdict rather than false malicious classification.

---

### E. TRANSACTION & RISK ENGINE PIPELINE
- **Routes:**
  - `POST /api/v1/trust-scores/evaluate-risk`
  - `POST /api/v1/trust-scores/evaluate`
- **Controllers:** `src/controllers/trustScore.controller.js`
- **Services:**
  1. `src/services/decisionPipeline.service.js` (`DecisionPipelineService.evaluateDecision`)
  2. `src/ml/riskEngine.service.js` (`RiskEngineService.predictRisk`)
  3. `src/ml/fraudModel.js` (`FraudModel.predict`)
  4. `src/services/policyEngine.service.js` (`PolicyEngineService.evaluatePolicies`)
  5. `src/services/lossCalculator.service.js` (`LossCalculatorService.calculateExpectedLoss`)
- **Models:**
  - **GBDT:** `src/ml/artifacts/gbdt-risk-v1.json` (Calibrated by `calibrator-gbdt-v1.json`)
  - **Logistic Regression:** `src/ml/artifacts/logreg-risk-v1.json` (Calibrated by `calibrator-logreg-v1.json`)
  - **Standard Scaler:** `src/ml/artifacts/scaler-v1.json`
  - **Legacy Logistic Regression:** `src/ml/modelWeights.json`
- **Input:** Transaction telemetry (`amount`, `velocity`, `failedAttempts`, `ipRisk`, `countryMismatch`, `accountAge`, etc.).
- **Output:** `decision` (`ALLOW`, `REVIEW`, `BLOCK`), `riskProbability`, `combinedRiskScore`, `expectedLoss`, `topRiskFactors`, `triggeredPolicy`.
- **Circuit Breaker & Fallback:**
  - If ML execution throws or times out: Circuit breaker activates fallback heuristic (`velocity > 10 || failedAttempts > 3 ? 0.75 : 0.20`), returns `modelVersion: 'fallback-heuristic-v1'`.

---

### F. GRAPH PIPELINE
- **Route:** `GET /api/v1/graph/investigate/:entityId`
- **Controller:** `src/controllers/graph.controller.js` (`investigateEntity`)
- **Service:** `src/services/graphEngine.service.js` & `src/services/graphAnalysis.service.js`
- **Detectors:**
  1. Adjacency builder & Connected Components (BFS/DFS).
  2. Directed Cycle Detection (Tarjan / DFS cycle detection for circular fund collusion).
  3. Shared Device Farm analysis (`USES_DEVICE` edges).
  4. Shared IP Subnet analysis (`USES_IP` edges).
  5. High-risk neighbor propagation count.
- **Model:** None (Graph Theory Algorithms).
- **Input:** Target `entityId`, traversal `depth` (1 - 3 hops).
- **Output:** `graphRiskScore`, `graphRiskLevel`, `features`, `sharedDevices`, `sharedIps`, `cycles`, `topology`.
- **Score:** Base: `10`; Shared device: up to `+40`; Shared IP: up to `+30`; Cycle detected: `+35`; Suspicious neighbors: up to `+25`. Max `100`.
- **Thresholds:** `CRITICAL` ($\ge 75$), `HIGH` ($\ge 50$), `MEDIUM` ($\ge 25$), `LOW` ($< 25$).

---

### G. CONTENT CREATOR AGGREGATION PIPELINE
- **Routes:** `POST /api/v1/creator/package`, `POST /api/v1/creator/collaboration`
- **Controller:** `src/controllers/creator.controller.js` (`analyzePackage`)
- **Service:** `src/services/creator.service.js` (`CreatorService.analyzeCreatorPackage`)
- **Orchestration:**
  - Image: Calls `ImageService.analyzeImage`
  - Text: Calls `TextService.detectAiGeneratedText`, `detectSocialEngineering`, `analyzeSentiment`
  - Website: Calls `WebsiteService.analyzeWebsite` (2500ms timeout)
  - Document: Calls `DocumentService.evaluateDocumentSecurity` (BUG: method does not exist)
  - Unified Synthesis: Calls `TrustScoreService.evaluateTrustScore(scoreInputs, userId)`
- **Input:** Package payload (`imageFileId`, `imageUrl`, `caption`, `websiteUrl`, `documentFileId`, `instagramUrl`).
- **Output:** `contentTrustScore`, `authenticity` (`High`/`Medium`/`Low`), `security`, `aiGenerationSignal` (`High`/`Moderate`/`Low`/`Minimal`), `sections`, `riskFindings`, `recommendations`.
- **Frontend Transformation:** `client/src/pages/CreatorWorkspacePage.jsx` renders Content Trust Score gauge, 5 metric badges, structured findings, and verification report generator.

---

## 3. Comprehensive Audit of Fallbacks, Defaults, and Mocks

### Categorized Findings: `LEGITIMATE` vs `POTENTIAL PROBLEM`

| Location | Pattern / Value | Classification | Forensic Root Cause & Operational Impact |
| :--- | :--- | :--- | :--- |
| `src/services/creator.service.js` (lines 183–191) | `imageAnalysis = { aiGenerationAssessment: { detected: false, likelihood: 0.15, classification: 'HUMAN' } }` | **POTENTIAL PROBLEM (CRITICAL)** | **Faked AI Result on URL:** If an image is submitted via URL rather than a file upload, CreatorService bypasses `ImageService` entirely and fabricates a mock human result with 0.15 likelihood! Known AI images provided via link get labeled "HUMAN". |
| `src/services/creator.service.js` (lines 288, 831, 1062) | `DocumentService.evaluateDocumentSecurity(...)` | **POTENTIAL PROBLEM (CRITICAL)** | **Dead Method Call:** `DocumentService` has no such method (the method is `analyzeDocument`). Throws a TypeError, silently caught by error handler, defaulting `documentScore = 75` and leaving document analysis empty. |
| `src/services/aiGenerationDetector.js` (lines 23–29, 106–108) | `SYNTHETIC_CONTENT_PATTERNS = [ /\bfor\s+(?:demonstration\|testing\|sample)\s+purposes?\s+only\b/i ... ]` | **POTENTIAL PROBLEM (CRITICAL)** | **False Positive on Authentic Docs:** Real QA guides, test plans, mock interview projects, contracts, and disclaimers containing "for demonstration purposes only" trigger `hasSyntheticDeclaration = true`, forcing `likelihood = 0.75` and `detected = true`. |
| `src/services/text.service.js` (lines 373–374) | `burstinessScore: 65.0`, `perplexityScore: Math.round(100 - aiAssessment.likelihood * 80)` | **POTENTIAL PROBLEM** | **Fabricated Metrics:** Burstiness is hardcoded to 65.0; Perplexity is a simple linear inversion of regex likelihood. Neither is computed from actual language token probabilities. |
| `src/services/creator.service.js` (lines 269–276) | `websiteAnalysis = { trustScore: 75, sslCertificate: { hasSsl: true, isAuthorized: true } }` | **POTENTIAL PROBLEM** | **Masking Link Failures:** If WebsiteService times out (>2500ms), CreatorService fabricates a mock valid SSL certificate and 75 trust score. |
| `src/services/trustScore.service.js` (lines 81–96) | Default fallback modality scores (`75.0`, `80.0`, `70.0`, `75.0`) | **POTENTIAL PROBLEM** | **Phantom Modality Scores:** When an analysis evaluates only 1 modality (e.g. image), the composite engine injects phantom scores for unprovided modalities into the category breakdown. |
| `src/services/image.service.js` (line 255) | `if (standard_ai_resolution) aiProbability += 0.30` | **POTENTIAL PROBLEM** | **Resolution Bias:** Any legitimate square image (1024x1024 or 512x512 avatar/crop) receives an immediate +0.30 AI probability penalty based purely on dimensions. |
| `src/services/creator.service.js` (line 353) | `scoreInputs.textScore = 80` | **POTENTIAL PROBLEM** | If no modalities are provided, injects a default textScore of 80 to avoid throwing a 400 error. |
| `src/services/aiImageDetector.service.js` (lines 142–159) | Returns `detectorStatus: 'MODEL_UNAVAILABLE'`, `aiGeneratedProbability: null` | **LEGITIMATE** | Correct fail-closed design: When the ONNX model is absent, it does not invent fake probabilities; it informs ImageService to rely on forensics. |
| `src/services/aiImageDetector.service.js` (lines 80–113) | Python subprocess fallback `runPythonInference` | **LEGITIMATE** | Cross-platform runtime resilience: When native `onnxruntime-node` C++ bindings fail on Windows, executes inference via Python ONNX runtime. |
| `src/services/website.service.js` (lines 398–400) | `verdict = 'INCONCLUSIVE'`, `trustScore = 40.0` on DNS resolution error | **LEGITIMATE** | Safe operational policy: Unresolvable domains are not marked malicious; they are marked inconclusive with reduced score. |
| `src/services/decisionPipeline.service.js` (lines 134–144) | Circuit breaker fallback heuristic (`velocity > 10 ? 0.75 : 0.20`) | **LEGITIMATE** | High-availability fallback: Protects production transaction throughput if the ML risk model crashes. |
| `src/services/decisionPipeline.service.js` (lines 154–160) | Default isolated graph score (`10`, `LOW`) | **LEGITIMATE** | Safe graph baseline: An isolated customer node with no relational edges has 0 shared abuse links. |
| `src/ml/featurePipeline.js` (lines 30–60) | Default values (`amount = 0`, `velocity = 1`, `accountAge = 30`) | **LEGITIMATE** | Standard ML data preprocessing: Input sanitization and missing-value imputation. |
| `src/services/simulator.service.js` (lines 22–70) | `Math.random()` synthetic attack generator | **LEGITIMATE** | Explicit test tool: Dedicated solely to generating live attack simulation traffic for security demonstrations. |

---

## 4. Architectural Summary & Forensic Findings

### 1. Current Architecture
TrustGraph is a multi-modal trust and risk evaluation platform consisting of:
- **Express Backend** (`src/`) with modular services for Image, Document, Text, Website, Graph, and Transactions.
- **Unified Creator Workspace** (`CreatorService`) acting as a multi-modal meta-orchestrator.
- **ML Layer** (`src/ml/`) containing an ONNX vision classifier, a trained GBDT transaction model, a calibrated Logistic Regression model, and an abuse-ring graph engine.
- **React Client** (`client/`) consuming domain-specific endpoints and presenting explainable trust gauges.

### 2. Current Detectors
- **Image:** Hybrid detector combining ONNX MobileNet-V3 neural network + EXIF sensor forensics + C2PA manifest scanner + Sharp ELA recompression difference engine.
- **Document:** `pdf-parse` / `mammoth` text extraction + PII regex scanner + `AiGenerationDetector` stylometric and disclaimer parser.
- **Text:** `AiGenerationDetector` + heuristic social engineering urgent-threat analyzer + VADER lexicon sentiment analyzer + clickbait trigger counter.
- **Website:** SSRF network guard + live TLS certificate inspector + Node DNS resolver + heuristic phishing URL pattern engine.
- **Transaction:** GBDT + Calibrated Logistic Regression + Graph abuse-ring cycle analyzer + deterministic policy rules.
- **Graph:** DFS/BFS topological component clustering + Tarjan directed cycle detection + shared device/IP abuse-ring detector.

### 3. Actual ML Models Operating
1. **`ml/artifacts/ai_image_detector.onnx`:** Real ONNX image classifier (MobileNet-V3 architecture) producing calibrated $P(\text{AI})$ and $P(\text{Real})$.
2. **`src/ml/artifacts/gbdt-risk-v1.json`:** Trained Gradient Boosted Decision Trees transaction model.
3. **`src/ml/artifacts/logreg-risk-v1.json`:** Trained regularized Logistic Regression model with Platt/Isotonic calibrator (`calibrator-logreg-v1.json`).
4. **`src/ml/modelWeights.json`:** Pre-calibrated regularized logistic weights for the default fraud model.

### 4. Heuristic / Rule-Based Detectors Operating
- **All Document & Text AI Detection:** Pure regex matching and stylometric sentence length variance. There is **no transformer or neural language model** running in Document or Text analysis.
- **Website Phishing & Safety:** Pure rule-based network inspection and keyword heuristic matching.
- **Image Manipulation (ELA):** Pure mathematical pixel delta between original and JPEG 75% recompression.

### 5. Default & Fallback Paths
- Image: Missing ONNX model $\rightarrow$ falls back to metadata heuristics only.
- Transaction: ML crash $\rightarrow$ circuit breaker falls back to velocity/attempts threshold heuristic.
- Creator URL Image: Bypasses ImageService $\rightarrow$ falls back to hardcoded mock `{ likelihood: 0.15, classification: 'HUMAN' }`.
- Creator Document: Calls non-existent `DocumentService.evaluateDocumentSecurity` $\rightarrow$ crashes into `catch` block $\rightarrow$ defaults `documentScore = 75`.

### 6. Data-Flow Problems
1. **Creator Image URL Bypassing Inference:** If an image is submitted via an image URL or Instagram preview instead of an uploaded file ID, `CreatorService` does not download the image; it injects a static mock object marking it human.
2. **Document Analysis Invocation Error in Creator:** `CreatorService` invokes a non-existent method `DocumentService.evaluateDocumentSecurity(fileId, userId)`, causing document verification in Creator Workspace to fail into a catch-block fallback `75` on every invocation.
3. **Ghost Modalities in TrustScore Breakdown:** When evaluating partial inputs, `TrustScoreService` fills in unprovided modalities with default values (`75.0`, `80.0`, `70.0`, `75.0`) rather than computing weights dynamically over available modalities.

### 7. Highest-Risk False-Positive & False-Negative Paths
- **Critical False-Positive (Document/Text):**
  - Any document or text containing common testing/disclaimer phrases like `"for demonstration purposes only"`, `"for testing purposes only"`, or `"fictional organization"` immediately gets tagged as **75% AI-generated** (`VERY_HIGH` / `HIGH`), adding AI risk warnings to authentic test plans and QA documents.
- **Critical False-Negative (Creator Image):**
  - Passing an AI image URL via `imageUrl` or Instagram link into `CreatorService` receives an automatic mock score of `imageScore = 80` and `likelihood = 0.15` (Human).
- **False-Positive (Image Resolution):**
  - Any real image that happens to be cropped to 1024x1024 or 512x512 without EXIF camera make/model receives an automatic $+0.30$ AI probability penalty.

### 8. Recommended Correction Order
1. **Fix `SYNTHETIC_CONTENT_PATTERNS` in `src/services/aiGenerationDetector.js`:** Remove standard educational/QA disclaimers (`"for demonstration purposes only"`, `"for testing purposes only"`) from triggering AI generation, or restrict them to explicit generative model attributions (`"generated by ChatGPT"`, `"written by Claude"`).
2. **Fix Dead Document Call in `src/services/creator.service.js`:** Replace calls to `DocumentService.evaluateDocumentSecurity(fileId, userId)` with `DocumentService.analyzeDocument(fileId, userId)`.
3. **Fix URL-based Image Handling in `src/services/creator.service.js`:** Ensure that when an `imageUrl` is supplied, the image buffer is fetched via HTTP and passed into `ImageService.analyzeImage` rather than returning a static mock human object.
4. **Dynamic Modality Weighting in `src/services/trustScore.service.js`:** Compute category weights solely across provided modalities instead of inserting static phantom defaults (`75`, `80`, `70`).
5. **Decouple Resolution Heuristic from AI Verdict in `src/services/image.service.js`:** Treat resolution (1024x1024) as an informational signal rather than an automatic $+0.30$ probability booster when no model or tool tags exist.
