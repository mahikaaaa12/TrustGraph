#!/usr/bin/env node
const path = require('path');
const ImageBenchmarkDatasetGenerator = require('../src/ml/image_ai/datasetGenerator');
const ImageBenchmarkEvaluator = require('../src/ml/image_ai/imageBenchmarkEvaluator');

async function main() {
  console.log('===============================================================');
  console.log('  TrustGraph Image Authenticity & AI Pipeline Benchmark Runner  ');
  console.log('===============================================================\n');

  const args = process.argv.slice(2);
  const forceGenerate = args.includes('--generate');
  const datasetDirArg = args.find(a => a.startsWith('--datasetPath='))?.split('=')[1] || ImageBenchmarkDatasetGenerator.DEFAULT_DATASET_DIR;
  const reportPathArg = args.find(a => a.startsWith('--outputReport='))?.split('=')[1] || path.join(process.cwd(), 'IMAGE_AI_DETECTION_EVALUATION.md');

  if (forceGenerate) {
    console.log(`[Benchmark] --generate flag detected. Regenerating benchmark dataset at ${datasetDirArg}...`);
    await ImageBenchmarkDatasetGenerator.generateDataset(datasetDirArg);
  }

  const startTime = Date.now();
  console.log(`[Benchmark] Starting evaluation on dataset: ${datasetDirArg}...`);

  try {
    const results = await ImageBenchmarkEvaluator.runBenchmark(datasetDirArg);
    const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

    const reportPath = ImageBenchmarkEvaluator.generateMarkdownReport(results, reportPathArg);

    console.log('\n---------------------------------------------------------------');
    console.log('                    BENCHMARK RESULTS SUMMARY                   ');
    console.log('---------------------------------------------------------------');
    console.log(`Dataset Size             : ${results.metadata.datasetSize} images`);
    console.log(`Model Version            : ${results.metadata.modelVersion}`);
    console.log(`Multi-Class Accuracy    : ${(results.overallMultiClassAccuracy * 100).toFixed(1)}%`);
    console.log(`AI Detection Precision   : ${(results.aiDetectionMetrics.precision * 100).toFixed(1)}%`);
    console.log(`AI Detection Recall      : ${(results.aiDetectionMetrics.recall * 100).toFixed(1)}%`);
    console.log(`AI Detection F1-Score    : ${results.aiDetectionMetrics.f1Score}`);
    console.log(`ROC-AUC                  : ${results.aiDetectionMetrics.rocAuc}`);
    console.log(`PR-AUC                   : ${results.aiDetectionMetrics.prAuc}`);
    console.log(`False Positives Count    : ${results.falsePositives.length}`);
    console.log(`False Negatives Count    : ${results.falseNegatives.length}`);
    console.log(`Execution Duration       : ${durationSec}s`);
    console.log('---------------------------------------------------------------');
    console.log(`[Benchmark] Report successfully written to:\n  -> ${reportPath}`);
    console.log('===============================================================\n');

  } catch (err) {
    console.error('[Benchmark Error] Execution failed:', err);
    process.exit(1);
  }
}

main();
