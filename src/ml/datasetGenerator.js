/**
 * Reproducible Synthetic Transaction Risk Dataset Generator
 * 
 * IMPORTANT: This dataset is strictly SYNTHETIC for prototyping and research.
 * It does NOT represent real production data or real customer transaction records.
 */

class Mulberry32 {
  constructor(seed = 42) {
    this.seed = seed;
  }

  next() {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextRange(min, max) {
    return min + this.next() * (max - min);
  }

  nextInt(min, max) {
    return Math.floor(this.nextRange(min, max + 1));
  }

  nextChoice(choices) {
    return choices[this.nextInt(0, choices.length - 1)];
  }
}

class DatasetGenerator {
  /**
   * Generates a reproducible synthetic dataset of transaction risk events.
   * @param {number} count Total number of samples to generate
   * @param {number} seed Deterministic pseudo-random seed
   */
  static generateSyntheticDataset(count = 2000, seed = 1337) {
    const rng = new Mulberry32(seed);
    const dataset = [];

    for (let i = 1; i <= count; i++) {
      // 1. Generate Base Entity & Profile Attributes
      const isFraudArchetype = rng.next() < 0.11; // ~11% base latent fraud intention
      const accountAgeDays = isFraudArchetype ? rng.nextInt(0, 30) : rng.nextInt(15, 1200);
      const merchantAgeDays = rng.nextInt(30, 2000);
      const customerAge = rng.nextInt(18, 75);
      const emailAgeDays = isFraudArchetype ? rng.nextInt(0, 15) : rng.nextInt(30, 1500);

      // 2. Generate Transaction Attributes
      let transactionAmount;
      if (isFraudArchetype) {
        // Fraudsters often test small amounts (< $5) or drain large amounts ($1500 - $8000)
        transactionAmount = rng.next() < 0.35
          ? parseFloat(rng.nextRange(0.99, 4.99).toFixed(2))
          : parseFloat(rng.nextRange(1200.0, 7500.0).toFixed(2));
      } else {
        transactionAmount = parseFloat(rng.nextRange(12.0, 350.0).toFixed(2));
      }

      const baselineMeanAmount = isFraudArchetype ? 80.0 : transactionAmount * rng.nextRange(0.8, 1.2);
      const unusualAmountRatio = parseFloat(Math.max(0.1, transactionAmount / (baselineMeanAmount || 1.0)).toFixed(2));

      // 3. Generate Behavioral & Velocity Telemetry
      const transactionFrequency = isFraudArchetype ? rng.nextInt(8, 45) : rng.nextInt(1, 10);
      const transactionVelocity = isFraudArchetype ? rng.nextInt(5, 25) : rng.nextInt(1, 4);
      const timeSincePrevTxMinutes = isFraudArchetype ? rng.nextInt(0, 15) : rng.nextInt(30, 1440);
      const failedAttempts = isFraudArchetype ? rng.nextInt(1, 6) : (rng.next() < 0.1 ? 1 : 0);

      // 4. Device & Network Telemetry
      const deviceAgeDays = isFraudArchetype ? rng.nextInt(0, 10) : rng.nextInt(10, 800);
      const deviceChanges = isFraudArchetype ? rng.nextInt(2, 7) : rng.nextInt(0, 1);
      const ipRisk = isFraudArchetype ? parseFloat(rng.nextRange(0.60, 0.99).toFixed(3)) : parseFloat(rng.nextRange(0.01, 0.25).toFixed(3));
      const countryMismatch = isFraudArchetype ? (rng.next() < 0.75 ? 1 : 0) : (rng.next() < 0.05 ? 1 : 0);
      const sharedDeviceCount = isFraudArchetype ? rng.nextInt(3, 12) : 1;
      const sharedIpCount = isFraudArchetype ? rng.nextInt(4, 20) : rng.nextInt(1, 2);

      // 5. Historical Risk & Chargeback Flags
      const refundRatio = isFraudArchetype ? parseFloat(rng.nextRange(0.15, 0.85).toFixed(3)) : parseFloat(rng.nextRange(0.0, 0.05).toFixed(3));
      const chargebackHistory = isFraudArchetype ? rng.nextInt(1, 4) : 0;
      const previousFraudCount = isFraudArchetype ? (rng.next() < 0.5 ? rng.nextInt(1, 3) : 0) : 0;

      // 6. Non-linear Ground-Truth Classification Formula
      let fraudLogit = -3.2; // Base log-odds (approx ~4% prior)
      fraudLogit += (ipRisk - 0.2) * 3.5;
      fraudLogit += (transactionVelocity > 6 ? 1.8 : -0.4);
      fraudLogit += (failedAttempts > 2 ? 1.5 : -0.3);
      fraudLogit += (countryMismatch === 1 ? 1.2 : -0.2);
      fraudLogit += (accountAgeDays < 7 ? 1.4 : -0.5);
      fraudLogit += (deviceChanges > 2 ? 1.3 : -0.2);
      fraudLogit += (sharedDeviceCount > 3 ? 1.7 : -0.3);
      fraudLogit += (chargebackHistory > 0 ? 2.0 : -0.4);
      fraudLogit += (unusualAmountRatio > 3.0 ? 1.6 : -0.2);
      fraudLogit += (emailAgeDays < 5 ? 1.2 : -0.3);

      const trueProbability = 1 / (1 + Math.exp(-fraudLogit));
      // Stochastic label assignment with realistic noise
      const is_fraud = rng.next() < trueProbability ? 1 : 0;

      dataset.push({
        id: `synth_tx_${seed}_${i}`,
        transactionAmount,
        transactionFrequency,
        transactionVelocity,
        merchantAge: merchantAgeDays,
        customerAge,
        failedAttempts,
        accountAge: accountAgeDays,
        deviceAge: deviceAgeDays,
        deviceChanges,
        ipRisk,
        countryMismatch,
        emailAge: emailAgeDays,
        refundRatio,
        chargebackHistory,
        previousFraudCount,
        timeSincePrevTx: timeSincePrevTxMinutes,
        unusualAmountRatio,
        sharedDeviceCount,
        sharedIpCount,
        is_fraud,
      });
    }

    return {
      datasetVersion: 'synthetic-tx-risk-v1.0.0',
      generatedAt: new Date().toISOString(),
      sampleCount: dataset.length,
      fraudCount: dataset.filter((d) => d.is_fraud === 1).length,
      fraudRate: parseFloat((dataset.filter((d) => d.is_fraud === 1).length / dataset.length).toFixed(4)),
      isSynthetic: true,
      disclaimer: 'This dataset is strictly synthetic for model training & evaluation prototyping. It does not contain real user transactions.',
      data: dataset,
    };
  }

  /**
   * Splits dataset into 70% Train, 15% Validation, 15% Held-out Test
   */
  static trainValTestSplit(dataset, trainRatio = 0.70, valRatio = 0.15) {
    const total = dataset.length;
    const trainEnd = Math.floor(total * trainRatio);
    const valEnd = Math.floor(total * (trainRatio + valRatio));

    return {
      train: dataset.slice(0, trainEnd),
      val: dataset.slice(trainEnd, valEnd),
      test: dataset.slice(valEnd),
    };
  }
}

module.exports = DatasetGenerator;
