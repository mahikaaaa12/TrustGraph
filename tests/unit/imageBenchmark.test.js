const path = require('path');
const ImageBenchmarkDatasetGenerator = require('../../src/ml/image_ai/datasetGenerator');
const ImageBenchmarkEvaluator = require('../../src/ml/image_ai/imageBenchmarkEvaluator');

describe('TrustGraph Image Pipeline Benchmark Unit & Integration Tests', () => {
  const testDatasetDir = path.join(__dirname, '../../test_datasets/unit_benchmark_test');
  let benchmarkResults = null;

  beforeAll(async () => {
    // Generate mini test dataset for unit evaluation
    await ImageBenchmarkDatasetGenerator.generateDataset(testDatasetDir);
    benchmarkResults = await ImageBenchmarkEvaluator.runBenchmark(testDatasetDir);
  }, 120000);

  it('1. should load manifest entries correctly', () => {
    const manifest = ImageBenchmarkEvaluator.loadManifest(testDatasetDir);
    expect(Array.isArray(manifest)).toBe(true);
    expect(manifest.length).toBeGreaterThan(0);
    expect(manifest[0]).toHaveProperty('sample_id');
    expect(manifest[0]).toHaveProperty('label');
  });

  it('2. should execute benchmark evaluation and produce metrics', () => {
    const results = benchmarkResults;

    expect(results).toHaveProperty('metadata');
    expect(results.metadata.modelVersion).toBe('1.0.0-onnx-mobilenet');
    expect(results).toHaveProperty('aiDetectionMetrics');
    expect(results.aiDetectionMetrics).toHaveProperty('precision');
    expect(results.aiDetectionMetrics).toHaveProperty('recall');
    expect(results.aiDetectionMetrics).toHaveProperty('rocAuc');
    expect(results.aiDetectionMetrics).toHaveProperty('prAuc');
    expect(results.aiDetectionMetrics.confusionMatrix).toHaveProperty('tp');

    expect(results).toHaveProperty('slices');
    expect(results.slices).toHaveProperty('byFormat');
    expect(results.slices).toHaveProperty('byResolution');
    expect(results.slices).toHaveProperty('byPerturbation');
  });

  it('3. should generate Markdown evaluation report without errors', () => {
    const results = benchmarkResults;
    const reportPath = path.join(testDatasetDir, 'TEST_EVALUATION.md');
    const generatedPath = ImageBenchmarkEvaluator.generateMarkdownReport(results, reportPath);

    expect(generatedPath).toBe(reportPath);
    const fs = require('fs');
    expect(fs.existsSync(reportPath)).toBe(true);
    const content = fs.readFileSync(reportPath, 'utf-8');
    expect(content).toContain('TrustGraph Image Authenticity & AI Detection Evaluation Report');
    expect(content).toContain('1.0.0-onnx-mobilenet');
  });
});
