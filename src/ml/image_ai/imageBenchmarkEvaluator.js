const fs = require('fs');
const path = require('path');
const ImageService = require('../../services/image.service');
const ImageBenchmarkDatasetGenerator = require('./datasetGenerator');

/**
 * Empirical Benchmark & Evaluation Engine for TrustGraph Image Authenticity Pipeline
 */
class ImageBenchmarkEvaluator {
  /**
   * Helper to parse CSV manifest file
   */
  static parseManifestCsv(csvPath) {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const entries = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = line.split(',').map(v => v.trim());
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = values[idx] || null;
      });
      entries.push(obj);
    }

    return entries;
  }

  /**
   * Load manifest from CSV or JSON
   */
  static loadManifest(datasetDir = ImageBenchmarkDatasetGenerator.DEFAULT_DATASET_DIR) {
    const csvPath = path.join(datasetDir, 'manifest.csv');
    const jsonPath = path.join(datasetDir, 'manifest.json');

    if (fs.existsSync(jsonPath)) {
      return JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    } else if (fs.existsSync(csvPath)) {
      return this.parseManifestCsv(csvPath);
    }
    throw new Error(`Manifest file not found in directory: ${datasetDir}`);
  }

  /**
   * Evaluates binary classification metrics at a given decision threshold
   */
  static computeBinaryMetrics(predictions, targetClass = 'AI_GENERATED', threshold = 0.55) {
    let tp = 0;
    let fp = 0;
    let tn = 0;
    let fn = 0;

    const falsePositives = [];
    const falseNegatives = [];

    for (const pred of predictions) {
      const isActualTarget = pred.actualLabel === targetClass;
      const score = pred.scores[targetClass] ?? pred.scores.aiLikelihood ?? 0.0;
      const isPredictedTarget = score >= threshold;

      if (isPredictedTarget && isActualTarget) {
        tp++;
      } else if (isPredictedTarget && !isActualTarget) {
        fp++;
        falsePositives.push({
          sampleId: pred.sampleId,
          actualLabel: pred.actualLabel,
          predictedScore: score,
          threshold,
          format: pred.format,
          resolution: pred.resolutionCategory,
          perturbation: pred.perturbationType,
          diagnostic: pred.diagnostic,
        });
      } else if (!isPredictedTarget && !isActualTarget) {
        tn++;
      } else if (!isPredictedTarget && isActualTarget) {
        fn++;
        falseNegatives.push({
          sampleId: pred.sampleId,
          actualLabel: pred.actualLabel,
          predictedScore: score,
          threshold,
          format: pred.format,
          resolution: pred.resolutionCategory,
          perturbation: pred.perturbationType,
          diagnostic: pred.diagnostic,
        });
      }
    }

    const total = tp + fp + tn + fn;
    const precision = tp + fp > 0 ? parseFloat((tp / (tp + fp)).toFixed(4)) : 1.0;
    const recall = tp + fn > 0 ? parseFloat((tp / (tp + fn)).toFixed(4)) : 0.0;
    const fpr = tn + fp > 0 ? parseFloat((fp / (tn + fp)).toFixed(4)) : 0.0;
    const f1Score = precision + recall > 0 ? parseFloat(((2 * precision * recall) / (precision + recall)).toFixed(4)) : 0.0;
    const accuracy = total > 0 ? parseFloat(((tp + tn) / total).toFixed(4)) : 0.0;

    return {
      threshold,
      targetClass,
      confusionMatrix: { tp, fp, tn, fn, total },
      precision,
      recall,
      fpr,
      f1Score,
      accuracy,
      falsePositives,
      falseNegatives,
    };
  }

  /**
   * Multi-threshold ROC and PR curve calculation with AUC trapezoidal numerical integration
   */
  static computeCurvesAndAuc(predictions, targetClass = 'AI_GENERATED', step = 0.02) {
    const rocPoints = [];
    const prPoints = [];

    for (let t = 1.0; t >= 0.0; t -= step) {
      const roundedT = parseFloat(t.toFixed(2));
      const res = this.computeBinaryMetrics(predictions, targetClass, roundedT);
      const { tp, fp, tn, fn } = res.confusionMatrix;

      const tpr = tp + fn > 0 ? tp / (tp + fn) : 0.0;
      const fpr = fp + tn > 0 ? fp / (fp + tn) : 0.0;
      const precision = tp + fp > 0 ? tp / (tp + fp) : 1.0;
      const recall = tpr;

      rocPoints.push({ threshold: roundedT, fpr: parseFloat(fpr.toFixed(4)), tpr: parseFloat(tpr.toFixed(4)) });
      prPoints.push({ threshold: roundedT, recall: parseFloat(recall.toFixed(4)), precision: parseFloat(precision.toFixed(4)) });
    }

    // Sort ROC points by FPR
    const sortedRoc = [...rocPoints].sort((a, b) => a.fpr - b.fpr || a.tpr - b.tpr);
    let rocAuc = 0.0;
    for (let i = 1; i < sortedRoc.length; i++) {
      const prev = sortedRoc[i - 1];
      const curr = sortedRoc[i];
      const dx = curr.fpr - prev.fpr;
      if (dx > 0) {
        const avgY = (prev.tpr + curr.tpr) / 2.0;
        rocAuc += dx * avgY;
      }
    }
    rocAuc = parseFloat(Math.min(1.0, Math.max(0.0, rocAuc)).toFixed(4));

    // Sort PR points by Recall
    const sortedPr = [...prPoints].sort((a, b) => a.recall - b.recall || a.precision - b.precision);
    let prAuc = 0.0;
    for (let i = 1; i < sortedPr.length; i++) {
      const prev = sortedPr[i - 1];
      const curr = sortedPr[i];
      const dx = curr.recall - prev.recall;
      if (dx > 0) {
        const avgY = (prev.precision + curr.precision) / 2.0;
        prAuc += dx * avgY;
      }
    }
    prAuc = parseFloat(Math.min(1.0, Math.max(0.0, prAuc)).toFixed(4));

    return {
      rocAuc,
      prAuc,
      rocPoints: sortedRoc,
      prPoints: sortedPr,
    };
  }

  /**
   * Computes confidence score distribution statistics and histogram
   */
  static computeConfidenceDistribution(predictions, targetClass = 'AI_GENERATED') {
    const scores = predictions.map(p => p.scores[targetClass] ?? p.scores.aiLikelihood ?? 0.0);
    if (scores.length === 0) return { mean: 0, median: 0, min: 0, max: 0, stdDev: 0, histogram: {} };

    const min = parseFloat(Math.min(...scores).toFixed(4));
    const max = parseFloat(Math.max(...scores).toFixed(4));
    const sum = scores.reduce((a, b) => a + b, 0);
    const mean = parseFloat((sum / scores.length).toFixed(4));

    const sorted = [...scores].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid] : parseFloat(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(4));

    const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
    const stdDev = parseFloat(Math.sqrt(variance).toFixed(4));

    const histogram = {
      '0.0 - 0.2': 0,
      '0.2 - 0.4': 0,
      '0.4 - 0.6': 0,
      '0.6 - 0.8': 0,
      '0.8 - 1.0': 0,
    };

    for (const s of scores) {
      if (s < 0.2) histogram['0.0 - 0.2']++;
      else if (s < 0.4) histogram['0.2 - 0.4']++;
      else if (s < 0.6) histogram['0.4 - 0.6']++;
      else if (s < 0.8) histogram['0.6 - 0.8']++;
      else histogram['0.8 - 1.0']++;
    }

    return { mean, median, min, max, stdDev, histogram };
  }

  /**
   * Primary Benchmark Execution Engine
   */
  static async runBenchmark(datasetDir = ImageBenchmarkDatasetGenerator.DEFAULT_DATASET_DIR) {
    if (!fs.existsSync(datasetDir)) {
      console.log(`[Benchmark] Dataset directory not found at ${datasetDir}. Auto-generating default benchmark dataset...`);
      await ImageBenchmarkDatasetGenerator.generateDataset(datasetDir);
    }

    const manifest = this.loadManifest(datasetDir);
    console.log(`[Benchmark] Loaded ${manifest.length} manifest records for pipeline evaluation.`);

    const predictions = [];

    for (let i = 0; i < manifest.length; i++) {
      const entry = manifest[i];
      const relImagePath = entry.image_path;
      const absImagePath = path.isAbsolute(relImagePath) ? relImagePath : path.join(datasetDir, relImagePath);

      if (!fs.existsSync(absImagePath)) {
        console.warn(`[Benchmark] Warning: File not found for sample ${entry.sample_id} at ${absImagePath}. Skipping.`);
        continue;
      }

      const fileBuffer = fs.readFileSync(absImagePath);

      // SANITIZED FILE RECORD: Ensure filename DOES NOT leak ground-truth labels to inference!
      const fileExt = path.extname(absImagePath);
      const sanitizedFileRecord = {
        id: `eval_file_${i + 1}`,
        fileName: `sanitized_eval_sample_${String(i + 1).padStart(3, '0')}${fileExt}`,
        filePath: absImagePath,
      };

      // Execute full pipeline analysis
      const analysis = await ImageService.analyzeImage(sanitizedFileRecord, fileBuffer);

      const aiLikelihood = analysis.aiAssessment?.likelihood ?? 0.0;
      const aiModelProb = analysis.aiModelDetector?.aiGeneratedProbability ?? null;
      const manipLikelihood = analysis.manipulationAssessment?.likelihood ?? 0.0;
      const provenanceStatus = analysis.provenanceAssessment?.status ?? 'UNVERIFIED';

      const maxAiScore = Math.max(aiLikelihood, aiModelProb !== null ? aiModelProb : 0.0);

      const predictedClass =
        maxAiScore >= 0.55
          ? 'AI_GENERATED'
          : manipLikelihood >= 0.40
          ? 'MANIPULATED_REAL'
          : provenanceStatus === 'VERIFIED'
          ? 'REAL'
          : 'UNKNOWN/AMBIGUOUS';

      predictions.push({
        sampleId: entry.sample_id,
        actualLabel: entry.label,
        predictedClass,
        format: entry.format || 'JPEG',
        resolutionCategory: entry.resolution_category || 'medium',
        perturbationType: entry.perturbation_type || 'none',
        scores: {
          AI_GENERATED: maxAiScore,
          aiLikelihood,
          aiModelProbability: aiModelProb,
          MANIPULATED_REAL: manipLikelihood,
          REAL: provenanceStatus === 'VERIFIED' ? 1.0 - maxAiScore : 0.4,
          trustScore: analysis.trustScore,
        },
        diagnostic: {
          aiAssessment: analysis.aiAssessment,
          aiModelDetector: analysis.aiModelDetector,
          manipulationAssessment: analysis.manipulationAssessment,
          provenanceAssessment: analysis.provenanceAssessment,
        },
      });
    }

    // ---------------------------------------------------------
    // COMPUTE OVERALL & COMPONENT METRICS
    // ---------------------------------------------------------
    const defaultThreshold = 0.55;

    const aiMetrics = this.computeBinaryMetrics(predictions, 'AI_GENERATED', defaultThreshold);
    const aiCurves = this.computeCurvesAndAuc(predictions, 'AI_GENERATED');
    const aiDist = this.computeConfidenceDistribution(predictions, 'AI_GENERATED');

    const realMetrics = this.computeBinaryMetrics(predictions, 'REAL', 0.50);
    const manipMetrics = this.computeBinaryMetrics(predictions, 'MANIPULATED_REAL', 0.40);

    // Multi-class Accuracy
    const correctClassifications = predictions.filter(p => p.actualLabel === p.predictedClass).length;
    const overallMultiClassAccuracy = predictions.length > 0 ? parseFloat((correctClassifications / predictions.length).toFixed(4)) : 0.0;

    // ---------------------------------------------------------
    // SLICED PERFORMANCE BREAKDOWNS
    // ---------------------------------------------------------
    const sliceByProperty = (propName) => {
      const groups = {};
      for (const p of predictions) {
        const val = p[propName] || 'unknown';
        if (!groups[val]) groups[val] = [];
        groups[val].push(p);
      }

      const report = {};
      for (const [key, groupPreds] of Object.entries(groups)) {
        const met = this.computeBinaryMetrics(groupPreds, 'AI_GENERATED', defaultThreshold);
        report[key] = {
          count: groupPreds.length,
          precision: met.precision,
          recall: met.recall,
          f1Score: met.f1Score,
          accuracy: met.accuracy,
        };
      }
      return report;
    };

    const slices = {
      byFormat: sliceByProperty('format'),
      byResolution: sliceByProperty('resolutionCategory'),
      byPerturbation: sliceByProperty('perturbationType'),
    };

    const benchmarkReport = {
      metadata: {
        timestamp: new Date().toISOString(),
        datasetSize: manifest.length,
        datasetDirectory: datasetDir,
        modelVersion: '1.0.0-onnx-mobilenet',
        forensicsVersion: 'forensics-multi-signal-v1',
        preprocessingVersion: 'sRGB Float32 224x224 (ImageNet Normalization)',
        defaultThreshold,
      },
      overallMultiClassAccuracy,
      aiDetectionMetrics: {
        threshold: defaultThreshold,
        confusionMatrix: aiMetrics.confusionMatrix,
        precision: aiMetrics.precision,
        recall: aiMetrics.recall,
        f1Score: aiMetrics.f1Score,
        rocAuc: aiCurves.rocAuc,
        prAuc: aiCurves.prAuc,
        confidenceDistribution: aiDist,
      },
      componentMetrics: {
        realDetection: {
          precision: realMetrics.precision,
          recall: realMetrics.recall,
          f1Score: realMetrics.f1Score,
        },
        manipulationDetection: {
          precision: manipMetrics.precision,
          recall: manipMetrics.recall,
          f1Score: manipMetrics.f1Score,
        },
      },
      slices,
      falsePositives: aiMetrics.falsePositives,
      falseNegatives: aiMetrics.falseNegatives,
    };

    // Save JSON output
    const jsonOutputPath = path.join(datasetDir, 'benchmark_results.json');
    fs.writeFileSync(jsonOutputPath, JSON.stringify(benchmarkReport, null, 2), 'utf-8');

    return benchmarkReport;
  }

  /**
   * Generates the Markdown Evaluation Report (IMAGE_AI_DETECTION_EVALUATION.md)
   */
  static generateMarkdownReport(benchmarkResults, outputPath = path.join(process.cwd(), 'IMAGE_AI_DETECTION_EVALUATION.md')) {
    const meta = benchmarkResults.metadata;
    const ai = benchmarkResults.aiDetectionMetrics;
    const cm = ai.confusionMatrix;
    const comp = benchmarkResults.componentMetrics;
    const slices = benchmarkResults.slices;
    const fps = benchmarkResults.falsePositives;
    const fns = benchmarkResults.falseNegatives;

    const formatSlicesTable = Object.entries(slices.byFormat).map(([fmt, m]) =>
      `| ${fmt} | ${m.count} | ${m.precision} | ${m.recall} | ${m.f1Score} | ${(m.accuracy * 100).toFixed(1)}% |`
    ).join('\n');

    const resSlicesTable = Object.entries(slices.byResolution).map(([res, m]) =>
      `| ${res} | ${m.count} | ${m.precision} | ${m.recall} | ${m.f1Score} | ${(m.accuracy * 100).toFixed(1)}% |`
    ).join('\n');

    const pertSlicesTable = Object.entries(slices.byPerturbation).map(([pert, m]) =>
      `| ${pert} | ${m.count} | ${m.precision} | ${m.recall} | ${m.f1Score} | ${(m.accuracy * 100).toFixed(1)}% |`
    ).join('\n');

    const fpRows = fps.length > 0
      ? fps.map(f => `| ${f.sampleId} | ${f.actualLabel} | ${(f.predictedScore * 100).toFixed(1)}% | ${f.format} / ${f.resolution} / ${f.perturbation} |`).join('\n')
      : '| None | N/A | N/A | No false positives detected |';

    const fnRows = fns.length > 0
      ? fns.map(f => `| ${f.sampleId} | ${f.actualLabel} | ${(f.predictedScore * 100).toFixed(1)}% | ${f.format} / ${f.resolution} / ${f.perturbation} |`).join('\n')
      : '| None | N/A | N/A | No false negatives detected |';

    const markdownContent = `# TrustGraph Image Authenticity & AI Detection Evaluation Report

> **Evaluation Mode**: Empirical Ground-Truth Benchmark Evaluation  
> **Timestamp**: ${meta.timestamp}  
> **Evaluated Model Version**: \`${meta.modelVersion}\`  
> **Forensics Engine Version**: \`${meta.forensicsVersion}\`  
> **Preprocessing Spec**: ${meta.preprocessingVersion}

---

## 1. Executive Summary & Benchmark Overview

This report documents the end-to-end empirical evaluation of the TrustGraph Image Authenticity Detection Pipeline. Evaluation was performed on a ground-truth dataset spanning **${meta.datasetSize} images** across four distinct categories: \`REAL\` (camera photos), \`AI_GENERATED\` (latent diffusion/generative model outputs), \`MANIPULATED_REAL\` (edited or recompressed photos), and \`UNKNOWN/AMBIGUOUS\` (web-stripped images).

> [!IMPORTANT]
> **Decoupled Evaluation Guard**: Filenames were sanitized during inference so that filename strings could not leak label metadata to the detector. Inference results reflect pure image content, EXIF metadata, ELA pixel anomalies, and trained neural network probabilities.

---

## 2. Key Performance Metrics Summary

| Metric | Score / Value | Target Benchmark Standard |
| :--- | :--- | :--- |
| **Overall Multi-Class Accuracy** | **${(benchmarkResults.overallMultiClassAccuracy * 100).toFixed(1)}%** | ≥ 85.0% |
| **AI Detection Precision** | **${(ai.precision * 100).toFixed(1)}%** | ≥ 90.0% |
| **AI Detection Recall** | **${(ai.recall * 100).toFixed(1)}%** | ≥ 85.0% |
| **AI Detection F1-Score** | **${ai.f1Score}** | ≥ 0.850 |
| **ROC-AUC (Receiver Operating Curve)** | **${ai.rocAuc}** | ≥ 0.900 |
| **PR-AUC (Precision-Recall Curve)** | **${ai.prAuc}** | ≥ 0.900 |
| **Decision Threshold** | \`${ai.threshold}\` | Configured |

---

## 3. Confusion Matrix (AI Detection Target)

- **Total Evaluated Samples**: ${cm.total}
- **True Positives (TP)**: ${cm.tp} (AI images correctly identified as AI)
- **True Negatives (TN)**: ${cm.tn} (Non-AI images correctly identified as Non-AI)
- **False Positives (FP)**: ${cm.fp} (Authentic/manipulated images falsely labeled AI)
- **False Negatives (FN)**: ${cm.fn} (AI images missed by the detector)

\`\`\`
                       PREDICTED AI        PREDICTED REAL/MANIP
ACTUAL AI              TP: \${cm.tp}               FN: \${cm.fn}
ACTUAL NON-AI          FP: \${cm.fp}               TN: \${cm.tn}
\`\`\`

---

## 4. Confidence Score Distribution Analysis

Confidence probability histogram ($P(\text{AI} \mid \text{IMAGE})$) across test set:

| Score Range | Sample Count | Distribution |
| :--- | :--- | :--- |
| **0.0 - 0.2** (High Confidence Real) | ${ai.confidenceDistribution.histogram['0.0 - 0.2']} | High Real |
| **0.2 - 0.4** (Low Real / Unlikely) | ${ai.confidenceDistribution.histogram['0.2 - 0.4']} | Low Real |
| **0.4 - 0.6** (Ambiguous / Inconclusive) | ${ai.confidenceDistribution.histogram['0.4 - 0.6']} | Ambiguous |
| **0.6 - 0.8** (Suspicious / Likely AI) | ${ai.confidenceDistribution.histogram['0.6 - 0.8']} | Suspicious |
| **0.8 - 1.0** (High Confidence AI) | ${ai.confidenceDistribution.histogram['0.8 - 1.0']} | High AI |

- **Mean AI Probability**: \`${ai.confidenceDistribution.mean}\`
- **Median AI Probability**: \`${ai.confidenceDistribution.median}\`
- **Std Deviation**: \`${ai.confidenceDistribution.stdDev}\`

---

## 5. Sub-Group Performance Slices

### Performance by File Format
| Format | Samples | Precision | Recall | F1-Score | Accuracy |
| :--- | :--- | :--- | :--- | :--- | :--- |
${formatSlicesTable}

### Performance by Image Resolution
| Resolution Range | Samples | Precision | Recall | F1-Score | Accuracy |
| :--- | :--- | :--- | :--- | :--- | :--- |
${resSlicesTable}

### Performance by Perturbation Type
| Perturbation | Samples | Precision | Recall | F1-Score | Accuracy |
| :--- | :--- | :--- | :--- | :--- | :--- |
${pertSlicesTable}

---

## 6. Failure Cases Analysis

### False Positives (Falsely Labeled as AI)
${fpRows}

### False Negatives (AI Images Missed)
${fnRows}

---

## 7. System Limitations & Technical Recommendations

1. **Stripped Web Images**: When EXIF camera tags are stripped by web proxies, the system relies strictly on neural model features and latent resolution heuristics.
2. **Heavy JPEG Compression**: High compression ratios (JPEG quality < 40) can degrade neural feature activation maps.
3. **Continuous Model Updating**: As new generative model architectures emerge (e.g. FLUX, SD3, Sora stills), the ONNX classifier should be periodically fine-tuned and re-evaluated using this benchmark suite.

---

## 8. Reproducibility

This benchmark can be executed reproducibly with a single command:

\`\`\`bash
npm run benchmark:image
\`\`\`
`;

    fs.writeFileSync(outputPath, markdownContent, 'utf-8');
    return outputPath;
  }
}

module.exports = ImageBenchmarkEvaluator;
