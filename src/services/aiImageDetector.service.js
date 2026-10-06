const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { DEFAULT_CONFIG } = require('../constants');

/**
 * Service Layer for Trained AI Image Detector Inference (ONNX Engine Architecture)
 * 
 * Clean Decoupled Interface:
 * AIImageDetector.detect(imageBuffer) -> returns standardized classifier result.
 * 
 * Until an actual trained ONNX model is placed on disk, explicitly returns:
 * detectorStatus: "MODEL_NOT_AVAILABLE" with null probabilities.
 */
class AIImageDetector {
  /**
   * Retrieves runtime model configuration from environment variables or defaults
   */
  static getModelConfig() {
    const modelPath = process.env.IMAGE_AI_MODEL_PATH || path.join(__dirname, '../ml/artifacts/ai_image_detector.onnx');
    const absolutePath = path.isAbsolute(modelPath) ? modelPath : path.resolve(process.cwd(), modelPath);
    const modelVersion = process.env.IMAGE_AI_MODEL_VERSION || '1.0.0-onnx-mobilenet';
    const enabled = process.env.IMAGE_AI_DETECTOR_ENABLED !== 'false';
    const timeoutMs = parseInt(process.env.IMAGE_AI_INFERENCE_TIMEOUT_MS || '5000', 10);

    return {
      modelPath: absolutePath,
      modelVersion,
      enabled,
      timeoutMs,
    };
  }

  /**
   * Preprocesses raw image buffer into normalized sRGB 3-channel float32 tensor (224x224)
   * Uses ImageNet standard normalization: mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225]
   */
  static async preprocessTensor(imageBuffer, targetWidth = 224, targetHeight = 224) {
    const rawBuffer = await sharp(imageBuffer)
      .resize(targetWidth, targetHeight, { fit: 'fill' })
      .removeAlpha()
      .toColourspace('srgb')
      .raw()
      .toBuffer();

    const totalPixels = targetWidth * targetHeight;
    const float32Data = new Float32Array(3 * totalPixels);

    const mean = [0.485, 0.456, 0.406];
    const std = [0.229, 0.224, 0.225];

    // NCHW format: [1, 3, 224, 224]
    for (let i = 0; i < totalPixels; i++) {
      const r = rawBuffer[i * 3] / 255.0;
      const g = rawBuffer[i * 3 + 1] / 255.0;
      const b = rawBuffer[i * 3 + 2] / 255.0;

      float32Data[i] = (r - mean[0]) / std[0]; // Channel 0 (Red)
      float32Data[totalPixels + i] = (g - mean[1]) / std[1]; // Channel 1 (Green)
      float32Data[2 * totalPixels + i] = (b - mean[2]) / std[2]; // Channel 2 (Blue)
    }

    return float32Data;
  }

  /**
   * Softmax mathematical operator over logit array
   */
  static softmax(logits) {
    const maxLogit = Math.max(...logits);
    const exps = logits.map((l) => Math.exp(l - maxLogit));
    const sumExps = exps.reduce((a, b) => a + b, 0);
    return exps.map((e) => e / sumExps);
  }

  /**
   * Python ONNX Runner Fallback when native Node bindings are absent
   */
  static async runPythonInference(modelPath, float32Data) {
    const { execFile } = require('child_process');
    const tmpDir = require('os').tmpdir();
    const tmpInput = path.join(tmpDir, `onnx_in_${Date.now()}_${Math.random().toString(36).substring(7)}.bin`);
    fs.writeFileSync(tmpInput, Buffer.from(float32Data.buffer));

    const pythonCode = `import sys, os, json, numpy as np, onnxruntime as ort
try:
    fpath, mpath = sys.argv[1], sys.argv[2]
    raw = np.fromfile(fpath, dtype=np.float32).reshape(1, 3, 224, 224)
    sess = ort.InferenceSession(mpath)
    iname = sess.get_inputs()[0].name
    oname = sess.get_outputs()[0].name
    res = sess.run([oname], {iname: raw})[0][0]
    print(json.dumps({"success": True, "logits": res.tolist()}))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
finally:
    if os.path.exists(fpath):
        os.remove(fpath)
`;

    return new Promise((resolve, reject) => {
      execFile('python', ['-c', pythonCode, tmpInput, modelPath], (err, stdout, stderr) => {
        if (err) return reject(new Error(`Python ONNX inference failed: ${stderr || err.message}`));
        try {
          const parsed = JSON.parse(stdout.trim());
          if (parsed.success) resolve(parsed.logits);
          else reject(new Error(parsed.error || 'Python ONNX inference error'));
        } catch (pErr) {
          reject(new Error(`Failed to parse Python ONNX output: ${pErr.message}`));
        }
      });
    });
  }

  /**
   * Master Detector Entry Point
   * Decouples the rest of TrustGraph from ONNX/PyTorch implementation details.
   */
  static async detect(imageBuffer, options = {}) {
    const config = this.getModelConfig();

    // 1. Detector Disabled Check
    if (!config.enabled) {
      return {
        detector: 'AI_IMAGE_CLASSIFIER',
        detectorStatus: 'DISABLED',
        modelVersion: config.modelVersion,
        aiGeneratedProbability: null,
        realImageProbability: null,
        confidence: 0.0,
        classification: 'INCONCLUSIVE',
        evidence: ['AI image detector model is disabled via environment configuration.'],
        diagnostic: {
          modelPath: config.modelPath,
          enabled: false,
          inferenceTimeMs: 0,
        },
      };
    }

    // 2. Model Availability Check
    if (!fs.existsSync(config.modelPath)) {
      return {
        detector: 'AI_IMAGE_CLASSIFIER',
        detectorStatus: 'MODEL_UNAVAILABLE',
        modelVersion: config.modelVersion,
        aiGeneratedProbability: null,
        realImageProbability: null,
        confidence: 0.0,
        classification: 'INCONCLUSIVE',
        evidence: ['Trained ONNX AI image model file is not present at configured model path.'],
        diagnostic: {
          modelPath: config.modelPath,
          enabled: true,
          inferenceTimeMs: 0,
          reason: 'No trained model file found at path.',
        },
      };
    }

    // 3. Invalid Image Buffer Guard
    if (!imageBuffer || !(imageBuffer instanceof Buffer) || imageBuffer.length === 0) {
      return {
        detector: 'AI_IMAGE_CLASSIFIER',
        detectorStatus: 'INVALID_INPUT',
        modelVersion: config.modelVersion,
        aiGeneratedProbability: null,
        realImageProbability: null,
        confidence: 0.0,
        classification: 'INCONCLUSIVE',
        evidence: ['Provided input buffer is empty or invalid.'],
        diagnostic: {
          modelPath: config.modelPath,
          enabled: true,
          inferenceTimeMs: 0,
        },
      };
    }

    const logger = require('../config/logger');
    const startTime = Date.now();

    logger.info(`[AIImageDetector] Image analysis started (modelVersion: ${config.modelVersion})`);

    try {
      // Execute Inference with Timeout Guard
      const inferencePromise = (async () => {
        let logits;

        try {
          const ort = require('onnxruntime-node');
          const session = await ort.InferenceSession.create(config.modelPath);
          logger.info(`[AIImageDetector] Model loaded successfully (modelPath: ${config.modelPath}, modelVersion: ${config.modelVersion})`);

          const float32Tensor = await this.preprocessTensor(imageBuffer, 224, 224);
          const tensor = new ort.Tensor('float32', float32Tensor, [1, 3, 224, 224]);

          const inputName = session.inputNames[0] || 'input';
          const feeds = { [inputName]: tensor };
          const results = await session.run(feeds);

          const outputName = session.outputNames[0] || 'output';
          const outputTensor = results[outputName];
          logits = Array.from(outputTensor.data);
        } catch (ortErr) {
          // Fallback to Python ONNX runtime
          const float32Tensor = await this.preprocessTensor(imageBuffer, 224, 224);
          logits = await this.runPythonInference(config.modelPath, float32Tensor);
          logger.info(`[AIImageDetector] Model loaded and executed via ONNX runtime (modelVersion: ${config.modelVersion})`);
        }

        // Softmax output probabilities: [p_real, p_ai]
        const probs = this.softmax(logits);
        const realProb = parseFloat((probs[0] || 0.5).toFixed(4));
        const aiProb = parseFloat((probs[1] || 0.5).toFixed(4));

        let classification = 'INCONCLUSIVE';
        if (aiProb >= 0.75) classification = 'LIKELY_AI_GENERATED';
        else if (aiProb >= 0.55) classification = 'SUSPICIOUS';
        else if (aiProb <= 0.25) classification = 'LIKELY_REAL';

        const confidence = parseFloat(Math.abs(aiProb - realProb).toFixed(4));
        const durationMs = Date.now() - startTime;

        logger.info(`[AIImageDetector] Inference completed (duration: ${durationMs}ms, modelVersion: ${config.modelVersion})`);

        return {
          detector: 'AI_IMAGE_CLASSIFIER',
          detectorStatus: 'AVAILABLE',
          modelVersion: config.modelVersion,
          aiGeneratedProbability: aiProb,
          realImageProbability: realProb,
          confidence,
          classification,
          evidence: [
            `Trained ONNX neural network inference complete (P(AI): ${(aiProb * 100).toFixed(1)}%).`,
            `Model version: ${config.modelVersion}`,
          ],
          diagnostic: {
            modelPath: config.modelPath,
            enabled: true,
            inferenceTimeMs: durationMs,
            rawLogits: logits,
          },
        };
      })();

      // Timeout Guard
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Inference timed out after ${config.timeoutMs}ms`)), config.timeoutMs)
      );

      return await Promise.race([inferencePromise, timeoutPromise]);
    } catch (err) {
      const isTimeout = err.message.includes('timed out');
      return {
        detector: 'AI_IMAGE_CLASSIFIER',
        detectorStatus: isTimeout ? 'TIMEOUT' : 'INFERENCE_ERROR',
        modelVersion: config.modelVersion,
        aiGeneratedProbability: null,
        realImageProbability: null,
        confidence: 0.0,
        classification: 'INCONCLUSIVE',
        evidence: [`Model inference error: ${err.message}`],
        diagnostic: {
          modelPath: config.modelPath,
          enabled: true,
          inferenceTimeMs: Date.now() - startTime,
          error: err.message,
        },
      };
    }
  }
}

module.exports = AIImageDetector;
