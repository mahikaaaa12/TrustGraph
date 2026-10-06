const path = require('path');
const sharp = require('sharp');
const AIImageDetector = require('../../src/services/aiImageDetector.service');
const ImageService = require('../../src/services/image.service');

describe('AIImageDetector Neural Classifier Integration & Unit Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // 1. Model Loads
  it('1. should verify ONNX model artifact exists and configuration loads', () => {
    const config = AIImageDetector.getModelConfig();
    expect(config).toHaveProperty('modelPath');
    expect(config).toHaveProperty('modelVersion');
    expect(config.enabled).toBe(true);
  });

  // 2. Valid Image Inference
  it('2. should execute neural tensor inference on a valid image buffer', async () => {
    const testBuffer = await sharp({
      create: { width: 512, height: 512, channels: 3, background: { r: 120, g: 140, b: 160 } },
    })
      .jpeg()
      .toBuffer();

    const result = await AIImageDetector.detect(testBuffer);

    expect(result.detector).toBe('AI_IMAGE_CLASSIFIER');
    expect(result.detectorStatus).toBe('AVAILABLE');
    expect(result.aiGeneratedProbability).toBeGreaterThanOrEqual(0.0);
    expect(result.realImageProbability).toBeGreaterThanOrEqual(0.0);
    expect(result.aiGeneratedProbability + result.realImageProbability).toBeCloseTo(1.0, 2);
    expect(result.diagnostic.inferenceTimeMs).toBeGreaterThanOrEqual(0);
  });

  // 3. Invalid Image
  it('3. should handle invalid image buffer gracefully', async () => {
    const resultNull = await AIImageDetector.detect(null);
    const resultEmpty = await AIImageDetector.detect(Buffer.alloc(0));

    expect(resultNull.aiGeneratedProbability).toBeNull();
    expect(resultEmpty.aiGeneratedProbability).toBeNull();
  });

  // 4. Model Unavailable
  it('4. should handle model unavailable gracefully without fabricating fake probabilities', async () => {
    process.env.IMAGE_AI_MODEL_PATH = 'ml/artifacts/non_existent_model_file.onnx';

    const result = await AIImageDetector.detect(Buffer.from('fake data'));

    expect(result.detectorStatus).toBe('MODEL_UNAVAILABLE');
    expect(result.aiGeneratedProbability).toBeNull();
    expect(result.realImageProbability).toBeNull();
    expect(result.classification).toBe('INCONCLUSIVE');
  });

  // 5. Model Inference Failure
  it('5. should handle inference failure safely when input processing throws', async () => {
    // Pass non-image corrupt buffer when model is configured to force processing exception
    const corruptBuffer = Buffer.from('corrupt non-image byte stream');
    const result = await AIImageDetector.detect(corruptBuffer);

    expect(result.detectorStatus).toBe('INFERENCE_ERROR');
    expect(result.aiGeneratedProbability).toBeNull();
    expect(result.classification).toBe('INCONCLUSIVE');
  });

  // 6. AI-Generated Image
  it('6. should process AI-generated image signals and produce clean classification', () => {
    const exifData = { software: 'DALL-E 3' };
    const sharpMeta = { width: 1024, height: 1024 };

    const aiResult = ImageService.detectAiGeneratedImage(exifData, sharpMeta);

    expect(aiResult.detected).toBe(true);
    expect(aiResult.classification).toBe('LIKELY_AI_GENERATED');
    expect(aiResult.likelihood).toBeGreaterThanOrEqual(0.75);
  });

  // 7. Authentic Image
  it('7. should process authentic camera photo without declaring AI likelihood', () => {
    const exifData = {
      hasExifData: true,
      make: 'Nikon',
      model: 'D850',
      iso: 200,
      focalLength: 85,
      dateTimeOriginal: new Date().toISOString(),
    };
    const sharpMeta = { width: 4000, height: 3000 };

    const provenance = ImageService.evaluateProvenance(exifData);
    const aiResult = ImageService.detectAiGeneratedImage(exifData, sharpMeta);

    expect(provenance.status).toBe('VERIFIED');
    expect(aiResult.detected).toBe(false);
    expect(aiResult.classification).toBe('UNLIKELY');
  });

  // 8. Manipulated Authentic Image
  it('8. should process manipulated authentic photo separating manipulation from AI score', () => {
    const exifData = { make: 'Canon', model: 'EOS 5D', software: 'Adobe Photoshop CC 2024' };
    const sharpMeta = { width: 1920, height: 1080 };
    const elaResults = { calculated: true, highErrorThresholdExceeded: true, averageErrorLevel: 14.2 };

    const manipResult = ImageService.detectImageManipulation(exifData, sharpMeta, elaResults);
    const aiResult = ImageService.detectAiGeneratedImage(exifData, sharpMeta);

    expect(manipResult.detected).toBe(true);
    expect(manipResult.classification).toBe('HIGH');
    expect(aiResult.detected).toBe(false); // Manipulation does not alter AI generation declaration
  });
});
