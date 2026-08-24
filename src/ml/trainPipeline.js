const fs = require('fs');
const path = require('path');
const DatasetGenerator = require('./datasetGenerator');
const FeaturePipeline = require('./featurePipeline');
const LogisticRegressionModel = require('./logisticRegression');
const GradientBoostedTreesModel = require('./gradientBoostedTrees');
const ModelEvaluator = require('./modelEvaluator');

/**
 * End-to-End ML Training, Validation, and Comparison Pipeline
 */
class TrainPipeline {
  static ARTIFACTS_DIR = path.resolve(__dirname, './artifacts');

  static runPipeline(options = {}) {
    const sampleCount = options.sampleCount || 2000;
    const seed = options.seed || 4242;

    if (!fs.existsSync(this.ARTIFACTS_DIR)) {
      fs.mkdirSync(this.ARTIFACTS_DIR, { recursive: true });
    }

    // 1. Generate Synthetic Dataset
    const rawDatasetObj = DatasetGenerator.generateSyntheticDataset(sampleCount, seed);
    const splits = DatasetGenerator.trainValTestSplit(rawDatasetObj.data, 0.70, 0.15);

    // 2. Fit Scaler ONLY on Training Split to prevent data leakage
    const scalerStats = FeaturePipeline.fitScaler(splits.train);

    // 3. Transform all splits using training statistics
    const trainData = FeaturePipeline.transformDataset(splits.train, scalerStats);
    const valData = FeaturePipeline.transformDataset(splits.val, scalerStats);
    const testData = FeaturePipeline.transformDataset(splits.test, scalerStats);

    const featureNames = FeaturePipeline.FEATURE_NAMES;

    // 4. Train Baseline: Logistic Regression
    const logReg = new LogisticRegressionModel(featureNames, {
      modelVersion: 'logreg-risk-v1.0.0',
      l2Penalty: 0.005,
    });
    const logRegTrainMeta = logReg.train(trainData, { epochs: 70, learningRate: 0.08, batchSize: 32 });

    // 5. Train Primary: Gradient Boosted Decision Trees
    const gbdt = new GradientBoostedTreesModel(featureNames, {
      modelVersion: 'gbdt-risk-v1.0.0',
      nEstimators: 30,
      maxDepth: 3,
      learningRate: 0.12,
    });
    const gbdtTrainMeta = gbdt.train(trainData);

    // 6. Threshold Optimization on Validation Set
    const logRegOpt = ModelEvaluator.findOptimalThreshold(logReg, valData);
    logReg.threshold = logRegOpt.optimalThreshold;

    const gbdtOpt = ModelEvaluator.findOptimalThreshold(gbdt, valData);
    gbdt.threshold = gbdtOpt.optimalThreshold;

    // 7. Rigorous Evaluation on Unseen Held-Out Test Set (15% of data)
    const logRegTestEval = ModelEvaluator.evaluate(logReg, testData, logReg.threshold);
    const gbdtTestEval = ModelEvaluator.evaluate(gbdt, testData, gbdt.threshold);

    // 8. Compile Comprehensive Model Comparison Report
    const comparisonReport = {
      pipelineRunAt: new Date().toISOString(),
      datasetMetadata: {
        version: rawDatasetObj.datasetVersion,
        totalSamples: rawDatasetObj.sampleCount,
        trainSamples: trainData.length,
        valSamples: valData.length,
        testSamples: testData.length,
        fraudRate: rawDatasetObj.fraudRate,
        isSynthetic: true,
      },
      featureVersion: FeaturePipeline.FEATURE_VERSION,
      models: {
        baseline_logistic_regression: {
          modelVersion: logReg.modelVersion,
          optimalThreshold: logReg.threshold,
          training: logRegTrainMeta,
          testEvaluation: logRegTestEval,
        },
        primary_gradient_boosted_trees: {
          modelVersion: gbdt.modelVersion,
          optimalThreshold: gbdt.threshold,
          training: gbdtTrainMeta,
          testEvaluation: gbdtTestEval,
        },
      },
      winner: gbdtTestEval.metrics.f1Score >= logRegTestEval.metrics.f1Score
        ? 'primary_gradient_boosted_trees'
        : 'baseline_logistic_regression',
      comparisonSummary: {
        rocAucDelta: parseFloat((gbdtTestEval.metrics.rocAuc - logRegTestEval.metrics.rocAuc).toFixed(4)),
        f1ScoreDelta: parseFloat((gbdtTestEval.metrics.f1Score - logRegTestEval.metrics.f1Score).toFixed(4)),
        financialLossDeltaUSD: parseFloat((gbdtTestEval.financialRisk.totalFinancialLoss - logRegTestEval.financialRisk.totalFinancialLoss).toFixed(2)),
      },
    };

    // 9. Persist Versioned Artifacts
    fs.writeFileSync(path.join(this.ARTIFACTS_DIR, 'scaler-v1.json'), JSON.stringify(scalerStats, null, 2));
    fs.writeFileSync(path.join(this.ARTIFACTS_DIR, 'logreg-risk-v1.json'), JSON.stringify(logReg.toJSON(), null, 2));
    fs.writeFileSync(path.join(this.ARTIFACTS_DIR, 'gbdt-risk-v1.json'), JSON.stringify(gbdt.toJSON(), null, 2));
    fs.writeFileSync(path.join(this.ARTIFACTS_DIR, 'model-comparison-v1.json'), JSON.stringify(comparisonReport, null, 2));

    return {
      report: comparisonReport,
      logReg,
      gbdt,
      scalerStats,
    };
  }
}

module.exports = TrainPipeline;
