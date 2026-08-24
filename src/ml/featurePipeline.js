/**
 * Deterministic Feature Engineering Pipeline
 * Enforces strict input validation, missing-value imputation, and standardized Z-score scaling.
 */

class FeaturePipeline {
  static FEATURE_VERSION = 'features-v1.0.0';

  static FEATURE_DEFINITIONS = [
    { name: 'transactionAmount', type: 'float', default: 50.0 },
    { name: 'transactionFrequency', type: 'int', default: 2 },
    { name: 'transactionVelocity', type: 'int', default: 1 },
    { name: 'merchantAge', type: 'int', default: 365 },
    { name: 'customerAge', type: 'int', default: 35 },
    { name: 'failedAttempts', type: 'int', default: 0 },
    { name: 'accountAge', type: 'int', default: 180 },
    { name: 'deviceAge', type: 'int', default: 90 },
    { name: 'deviceChanges', type: 'int', default: 0 },
    { name: 'ipRisk', type: 'float', default: 0.1 },
    { name: 'countryMismatch', type: 'int', default: 0 },
    { name: 'emailAge', type: 'int', default: 365 },
    { name: 'refundRatio', type: 'float', default: 0.0 },
    { name: 'chargebackHistory', type: 'int', default: 0 },
    { name: 'previousFraudCount', type: 'int', default: 0 },
    { name: 'timeSincePrevTx', type: 'int', default: 300 },
    { name: 'unusualAmountRatio', type: 'float', default: 1.0 },
    { name: 'sharedDeviceCount', type: 'int', default: 1 },
    { name: 'sharedIpCount', type: 'int', default: 1 },
  ];

  static FEATURE_NAMES = FeaturePipeline.FEATURE_DEFINITIONS.map((f) => f.name);

  /**
   * Fits scaling parameters (mean and standard deviation) from training data ONLY.
   * Prevents test data leakage.
   */
  static fitScaler(trainDataset) {
    const stats = {
      featureVersion: this.FEATURE_VERSION,
      fittedAt: new Date().toISOString(),
      sampleCount: trainDataset.length,
      mean: {},
      std: {},
      min: {},
      max: {},
    };

    for (const feat of this.FEATURE_NAMES) {
      const values = trainDataset.map((row) => Number(row[feat] ?? this.getDefaultValue(feat)));
      const count = values.length || 1;
      const mean = values.reduce((sum, v) => sum + v, 0) / count;
      const variance = values.reduce((sq, v) => sq + Math.pow(v - mean, 2), 0) / count;
      const std = Math.sqrt(variance) || 1.0;
      const min = Math.min(...values);
      const max = Math.max(...values);

      stats.mean[feat] = parseFloat(mean.toFixed(6));
      stats.std[feat] = parseFloat(std.toFixed(6));
      stats.min[feat] = parseFloat(min.toFixed(6));
      stats.max[feat] = parseFloat(max.toFixed(6));
    }

    return stats;
  }

  static getDefaultValue(featureName) {
    const def = this.FEATURE_DEFINITIONS.find((f) => f.name === featureName);
    return def ? def.default : 0.0;
  }

  /**
   * Validates raw input object, imputes missing values, and normalizes types.
   */
  static validateAndCleanInputs(rawInputs = {}) {
    const cleaned = {};

    for (const def of this.FEATURE_DEFINITIONS) {
      const val = rawInputs[def.name];

      if (val === undefined || val === null || val === '' || isNaN(Number(val))) {
        cleaned[def.name] = def.default;
      } else if (def.type === 'int') {
        cleaned[def.name] = Math.round(Number(val));
      } else {
        cleaned[def.name] = parseFloat(Number(val).toFixed(4));
      }
    }

    return cleaned;
  }

  /**
   * Transforms raw transaction inputs into scaled feature vector using pre-fitted scaler.
   */
  static transform(rawInputs, scalerStats) {
    const cleaned = this.validateAndCleanInputs(rawInputs);
    const scaledArray = [];
    const scaledDict = {};

    for (const feat of this.FEATURE_NAMES) {
      const rawVal = cleaned[feat];
      const mean = scalerStats?.mean?.[feat] ?? 0.0;
      const std = scalerStats?.std?.[feat] ?? 1.0;

      const zScore = std > 0.000001 ? (rawVal - mean) / std : 0.0;
      const clampedZ = Math.max(-5.0, Math.min(5.0, zScore));

      scaledArray.push(clampedZ);
      scaledDict[feat] = parseFloat(clampedZ.toFixed(4));
    }

    return {
      featureVersion: this.FEATURE_VERSION,
      rawFeatures: cleaned,
      scaledFeatures: scaledDict,
      featureVector: scaledArray,
    };
  }

  /**
   * Batch transforms a dataset.
   */
  static transformDataset(dataset, scalerStats) {
    return dataset.map((row) => {
      const transformed = this.transform(row, scalerStats);
      return {
        ...transformed,
        label: row.is_fraud !== undefined ? Number(row.is_fraud) : undefined,
      };
    });
  }
}

module.exports = FeaturePipeline;
