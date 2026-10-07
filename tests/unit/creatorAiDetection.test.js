const CreatorService = require('../../src/services/creator.service');
const ImageService = require('../../src/services/image.service');
const TrustScoreService = require('../../src/services/trustScore.service');

describe('Creator AI Image Detection & Authenticity Mapping Unit Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('TEST 1: AI-generated image (C2PA / high probability) results in AI Signal HIGH and Authenticity LOW', async () => {
    // Mock ImageService.analyzeImage returning real pipeline structure for an AI-generated image
    jest.spyOn(ImageService, 'analyzeImage').mockResolvedValue({
      overallTrustScore: 20.9,
      trustScore: 20.9,
      confidenceScore: 0.88,
      aiGenerationAssessment: {
        detected: true,
        likelihood: 0.95,
        confidence: 0.99,
        classification: 'LIKELY_AI_GENERATED',
        signals: [
          {
            type: 'ai_software_signature',
            severity: 'very_high',
            confidence: 0.99,
            weight: 0.8,
            description: 'Embedded metadata or C2PA manifest matches AI generator signature ("c2pa").',
            source: 'metadata',
          },
        ],
      },
      aiModelDetector: {
        detector: 'AI_IMAGE_CLASSIFIER',
        detectorStatus: 'AVAILABLE',
        modelVersion: '1.0.0-onnx-mobilenet',
        aiGeneratedProbability: 0.91,
        realImageProbability: 0.09,
        confidence: 0.82,
        classification: 'LIKELY_AI_GENERATED',
        evidence: ['Trained ONNX neural network inference complete (P(AI): 91.0%).'],
      },
      manipulationAssessment: {
        detected: false,
        likelihood: 0.0,
        confidence: 0.78,
        classification: 'UNLIKELY',
        signals: [],
      },
      provenanceAssessment: {
        status: 'UNVERIFIED',
        confidence: 0.65,
        signals: ['EXIF metadata unavailable or stripped.'],
      },
      errorLevelAnalysis: {
        averageErrorLevel: 1.2,
      },
    });

    const result = await CreatorService.analyzeCreatorPackage({
      mode: 'image',
      imageFileId: 'mock_ai_file_id',
    }, null, 'http://localhost:5000');

    // Verification Requirements:
    // 1. AI Generation Signal MUST be HIGH
    expect(result.aiGenerationSignal).toBe('High');

    // 2. Authenticity MUST be LOW
    expect(result.authenticity).toBe('Low');

    // 3. Trust Score must reflect synthetic generation
    expect(result.contentTrustScore).toBeLessThanOrEqual(35);

    // 4. Content risk finding added
    const aiRisk = result.riskFindings.find((r) => r.category === 'AI_CONTENT');
    expect(aiRisk).toBeDefined();
    expect(aiRisk.severity).toBe('high');

    // 5. Section verification
    expect(result.sections.authenticity.status).toBe('Low');
    expect(result.sections.aiContentSignals.status).toBe('High');
    expect(result.sections.imageForensics.status).toBe('AI Generated');

    // 6. Distinct separation: Manipulation remains separate
    expect(result.sections.imageForensics.evidence).toContain('Synthetic AI image generation detected.');
  });

  test('TEST 2: Neural classifier detects AI without C2PA - results in AI Signal HIGH and Authenticity LOW', async () => {
    // Mock ImageService.analyzeImage where neural model flags image (e.g. 58% AI, stripped EXIF)
    jest.spyOn(ImageService, 'analyzeImage').mockResolvedValue({
      overallTrustScore: 35.0,
      trustScore: 35.0,
      confidenceScore: 0.75,
      aiGenerationAssessment: {
        detected: true,
        likelihood: 0.58,
        confidence: 0.75,
        classification: 'LIKELY_AI_GENERATED',
        signals: [
          {
            type: 'neural_ai_classifier',
            severity: 'high',
            confidence: 0.75,
            weight: 0.5,
            description: 'Trained neural classifier estimated P(AI) = 57.7% (SUSPICIOUS, model: 1.0.0-onnx-mobilenet).',
            source: 'model',
          },
        ],
      },
      aiModelDetector: {
        detector: 'AI_IMAGE_CLASSIFIER',
        detectorStatus: 'AVAILABLE',
        modelVersion: '1.0.0-onnx-mobilenet',
        aiGeneratedProbability: 0.58,
        realImageProbability: 0.42,
        confidence: 0.16,
        classification: 'SUSPICIOUS',
        evidence: ['Trained ONNX neural network inference complete (P(AI): 57.7%).'],
      },
      manipulationAssessment: {
        detected: false,
        likelihood: 0.0,
        confidence: 0.78,
        classification: 'UNLIKELY',
        signals: [],
      },
      provenanceAssessment: {
        status: 'UNVERIFIED',
        confidence: 0.65,
        signals: ['EXIF metadata unavailable or stripped.'],
      },
      errorLevelAnalysis: {
        averageErrorLevel: 0.5,
      },
    });

    const result = await CreatorService.analyzeCreatorPackage({
      mode: 'image',
      imageFileId: 'mock_hospital_image_id',
    }, null, 'http://localhost:5000');

    expect(result.aiGenerationSignal).toBe('High');
    expect(result.authenticity).toBe('Low');
    expect(result.sections.aiContentSignals.status).toBe('High');
    expect(result.sections.imageForensics.status).toBe('AI Generated');
  });

  test('TEST 3: Authentic Camera Image with verified EXIF is NOT flagged as High AI', async () => {
    jest.spyOn(ImageService, 'analyzeImage').mockResolvedValue({
      overallTrustScore: 92.0,
      trustScore: 92.0,
      confidenceScore: 0.92,
      aiGenerationAssessment: {
        detected: false,
        likelihood: 0.05,
        confidence: 0.90,
        classification: 'UNLIKELY',
        signals: [],
      },
      aiModelDetector: {
        detector: 'AI_IMAGE_CLASSIFIER',
        detectorStatus: 'AVAILABLE',
        modelVersion: '1.0.0-onnx-mobilenet',
        aiGeneratedProbability: 0.12,
        realImageProbability: 0.88,
        confidence: 0.76,
        classification: 'LIKELY_REAL',
        evidence: ['Trained ONNX neural network inference complete (P(AI): 12.0%).'],
      },
      manipulationAssessment: {
        detected: false,
        likelihood: 0.0,
        confidence: 0.85,
        classification: 'UNLIKELY',
        signals: [],
      },
      provenanceAssessment: {
        status: 'VERIFIED',
        confidence: 0.95,
        signals: ['Complete camera sensor hardware provenance verified.'],
      },
      exifData: {
        hasExifData: true,
        make: 'Canon',
        model: 'EOS R5',
      },
      errorLevelAnalysis: {
        averageErrorLevel: 1.5,
      },
    });

    const result = await CreatorService.analyzeCreatorPackage({
      mode: 'image',
      imageFileId: 'mock_real_camera_photo_id',
    }, null, 'http://localhost:5000');

    // Clean camera photo must NOT be marked High AI
    expect(result.aiGenerationSignal).toBe('Minimal');
    expect(result.authenticity).toBe('High');
    expect(result.contentTrustScore).toBeGreaterThanOrEqual(70);
    expect(result.sections.aiContentSignals.status).toBe('Minimal');
    expect(result.sections.imageForensics.status).toBe('Original');
  });
});
