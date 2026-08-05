const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ExifParser = require('exif-parser');
const UploadedFile = require('../models/UploadedFile');
const Analysis = require('../models/Analysis');
const History = require('../models/History');
const AppError = require('../utils/appError');
const { HTTP_STATUS } = require('../constants');

/**
 * Service Layer for Advanced Image Forensics, EXIF Analysis, AI Image Detection, and Error Level Analysis (ELA)
 */
class ImageService {
  /**
   * 1. Extracts EXIF Metadata from JPEG/TIFF image buffer.
   */
  static extractExifMetadata(fileBuffer) {
    try {
      const parser = ExifParser.create(fileBuffer);
      const result = parser.parse();

      if (!result || !result.tags || Object.keys(result.tags).length === 0) {
        return { hasExifData: false, tags: {} };
      }

      return {
        hasExifData: true,
        make: result.tags.Make || null,
        model: result.tags.Model || null,
        software: result.tags.Software || result.tags.ProcessingSoftware || null,
        dateTimeOriginal: result.tags.DateTimeOriginal
          ? new Date(result.tags.DateTimeOriginal * 1000).toISOString()
          : null,
        exposureTime: result.tags.ExposureTime || null,
        fNumber: result.tags.FNumber || null,
        iso: result.tags.ISO || null,
        focalLength: result.tags.FocalLength || null,
        gps: {
          latitude: result.tags.GPSLatitude || null,
          longitude: result.tags.GPSLongitude || null,
        },
        tags: result.tags,
      };
    } catch (err) {
      return { hasExifData: false, tags: {}, error: 'No EXIF metadata segment found in file.' };
    }
  }

  /**
   * 2. Detects evidence of digital image manipulation (Photoshop, GIMP, Canva, software traces).
   */
  static detectImageManipulation(exifData, sharpMeta) {
    const editingSoftwareKeywords = [
      'photoshop',
      'gimp',
      'lightroom',
      'paint.net',
      'canva',
      'pixlr',
      'affinity',
      'snapseed',
      'adobe',
    ];

    let manipulationScore = 0; // 0 to 100
    const indicators = [];

    const softwareString = (exifData.software || '').toLowerCase();
    const detectedSoftware = editingSoftwareKeywords.find((kw) => softwareString.includes(kw));

    if (detectedSoftware) {
      manipulationScore += 45;
      indicators.push(`EXIF Software trace detected editing tool: "${exifData.software}"`);
    }

    if (!exifData.hasExifData) {
      manipulationScore += 20;
      indicators.push('EXIF metadata has been completely stripped or purged.');
    }

    if (exifData.hasExifData && !exifData.dateTimeOriginal) {
      manipulationScore += 15;
      indicators.push('Original camera timestamp tag (DateTimeOriginal) is missing.');
    }

    manipulationScore = Math.min(100, manipulationScore);

    return {
      manipulationScore,
      isLikelyManipulated: manipulationScore >= 40,
      detectedSoftware: detectedSoftware || null,
      indicators,
    };
  }

  /**
   * 3. Basic AI-Generated Image Detection.
   * AI generators (Midjourney, DALL-E, Stable Diffusion) lack camera sensor EXIF tags
   * and often render at fixed square/portrait aspect ratios (1024x1024, 512x512, 1024x1792).
   */
  static detectAiGeneratedImage(exifData, sharpMeta) {
    let aiProbability = 0.0;
    const aiIndicators = [];

    const aiSoftwareKeywords = [
      'midjourney',
      'dall-e',
      'dalle',
      'stable diffusion',
      'novelai',
      'automatic1111',
      'comfyui',
      'bing image creator',
      'firefly',
      'flux',
    ];

    const softwareString = (exifData.software || '').toLowerCase();
    const detectedAiTool = aiSoftwareKeywords.find((kw) => softwareString.includes(kw));

    if (detectedAiTool) {
      aiProbability += 0.9;
      aiIndicators.push(`EXIF Software tag explicitly matches AI Generator signature: "${exifData.software}"`);
    }

    // AI images lack camera hardware tags (Make, Model, Lens, ISO, Focal Length)
    const hasCameraHardware = exifData.make || exifData.model || exifData.iso || exifData.focalLength;
    if (!hasCameraHardware) {
      aiProbability += 0.35;
      aiIndicators.push('Absence of physical camera hardware tags (Make, Model, ISO, Focal Length).');
    }

    // Common AI Generator synthetic resolution check (exact 512, 1024, 768 dimensions)
    const { width, height } = sharpMeta;
    const isStandardAiResolution =
      (width === 1024 && height === 1024) ||
      (width === 512 && height === 512) ||
      (width === 1024 && height === 1792) ||
      (width === 1792 && height === 1024);

    if (isStandardAiResolution && !hasCameraHardware) {
      aiProbability += 0.3;
      aiIndicators.push(`Resolution matches standard AI generator output tensor dimensions (${width}x${height}).`);
    }

    aiProbability = Math.min(1.0, parseFloat(aiProbability.toFixed(2)));

    return {
      aiProbability,
      isLikelyAiGenerated: aiProbability >= 0.6,
      aiIndicators,
    };
  }

  /**
   * 4. Error Level Analysis (ELA) Engine.
   * Resaves the image at a known 95% JPEG quality level and computes pixel-by-pixel error delta.
   */
  static async performErrorLevelAnalysis(filePath, fileName) {
    const originalSharp = sharp(filePath);
    const meta = await originalSharp.metadata();

    // Standardize to JPEG buffer at 95% quality
    const originalJpegBuffer = await originalSharp.jpeg({ quality: 100 }).toBuffer();
    const resavedJpegBuffer = await sharp(originalJpegBuffer).jpeg({ quality: 95 }).toBuffer();

    // Extract raw RGB pixel buffer representations
    const rawOriginal = await sharp(originalJpegBuffer).raw().toBuffer({ resolveWithObject: true });
    const rawResaved = await sharp(resavedJpegBuffer).raw().toBuffer({ resolveWithObject: true });

    const width = rawOriginal.info.width;
    const height = rawOriginal.info.height;
    const channels = rawOriginal.info.channels; // 3 for RGB, 4 for RGBA
    const totalPixels = width * height;

    const elaBuffer = Buffer.alloc(rawOriginal.data.length);
    let totalError = 0;
    const SCALE_FACTOR = 15; // Amplify error intensity for visualization

    for (let i = 0; i < rawOriginal.data.length; i += channels) {
      const diffR = Math.abs(rawOriginal.data[i] - rawResaved.data[i]);
      const diffG = Math.abs(rawOriginal.data[i + 1] - rawResaved.data[i + 1]);
      const diffB = Math.abs(rawOriginal.data[i + 2] - rawResaved.data[i + 2]);

      const pixelError = (diffR + diffG + diffB) / 3;
      totalError += pixelError;

      // Scale error intensities
      elaBuffer[i] = Math.min(255, diffR * SCALE_FACTOR);
      elaBuffer[i + 1] = Math.min(255, diffG * SCALE_FACTOR);
      elaBuffer[i + 2] = Math.min(255, diffB * SCALE_FACTOR);
      if (channels === 4) elaBuffer[i + 3] = 255; // Alpha channel
    }

    const averageErrorLevel = parseFloat((totalError / totalPixels).toFixed(2));

    // Save generated ELA Heatmap image to disk
    const elaFileName = `ela-${fileName}`;
    const elaFilePath = path.join(__dirname, '../uploads', elaFileName);

    await sharp(elaBuffer, {
      raw: { width, height, channels },
    })
      .jpeg()
      .toFile(elaFilePath);

    return {
      averageErrorLevel,
      highErrorThresholdExceeded: averageErrorLevel > 12.0,
      elaHeatmapFileName: elaFileName,
      elaScaleFactor: SCALE_FACTOR,
    };
  }

  /**
   * Master Image Analysis Orchestration Pipeline.
   */
  static async analyzeImage(fileId, userId, reqHost = '') {
    const fileRecord = await UploadedFile.findOne({ _id: fileId, userId });
    if (!fileRecord) {
      throw new AppError('Image file not found or access denied.', HTTP_STATUS.NOT_FOUND);
    }

    const fileBuffer = fs.readFileSync(fileRecord.filePath);
    const sharpInstance = sharp(fileRecord.filePath);
    const sharpMeta = await sharpInstance.metadata();

    // 1. Extract EXIF
    const exifData = this.extractExifMetadata(fileBuffer);

    // 2. Detect Manipulation
    const manipulationResults = this.detectImageManipulation(exifData, sharpMeta);

    // 3. Detect AI Generation
    const aiResults = this.detectAiGeneratedImage(exifData, sharpMeta);

    // 4. Perform Error Level Analysis (ELA)
    const elaResults = await this.performErrorLevelAnalysis(fileRecord.filePath, fileRecord.fileName);

    // Calculate Overall Image Trust Score (0-100)
    let trustScore = 100.0;
    trustScore -= manipulationResults.manipulationScore * 0.4;
    trustScore -= aiResults.aiProbability * 40;
    if (elaResults.highErrorThresholdExceeded) trustScore -= 20;

    trustScore = Math.max(0.0, Math.min(100.0, parseFloat(trustScore.toFixed(1))));

    let riskCategory = 'low';
    if (trustScore < 40) riskCategory = 'critical';
    else if (trustScore < 65) riskCategory = 'high';
    else if (trustScore < 85) riskCategory = 'medium';

    // Create Analysis record in MongoDB
    const analysisRecord = await Analysis.create({
      userId,
      targetEntity: fileRecord.originalName,
      entityType: 'content',
      trustScore,
      confidenceScore: 0.95,
      status: 'completed',
      riskCategory,
      insights: [
        `Image Dimensions: ${sharpMeta.width}x${sharpMeta.height} (${sharpMeta.format.toUpperCase()}).`,
        manipulationResults.isLikelyManipulated
          ? `WARNING: Digital manipulation traces detected (Score: ${manipulationResults.manipulationScore}/100).`
          : 'CLEAN: No explicit digital editing software signatures found.',
        aiResults.isLikelyAiGenerated
          ? `AI WARNING: High probability of AI generation (${(aiResults.aiProbability * 100).toFixed(0)}%).`
          : 'AI CLEAN: Image exhibits physical camera sensor characteristics.',
        `ELA Score: ${elaResults.averageErrorLevel} (Heatmap saved).`,
      ],
      graphMetadata: {
        nodeCount: sharpMeta.width * sharpMeta.height,
        edgeCount: Math.round(elaResults.averageErrorLevel),
        centralityScore: trustScore / 100,
      },
    });

    // Log History audit event
    await History.create({
      userId,
      action: 'ANALYSIS_RUN',
      entityId: analysisRecord._id,
      entityType: 'Analysis',
      details: {
        fileName: fileRecord.originalName,
        trustScore,
        riskCategory,
      },
    });

    return {
      analysisId: analysisRecord._id,
      fileInfo: {
        originalName: fileRecord.originalName,
        width: sharpMeta.width,
        height: sharpMeta.height,
        format: sharpMeta.format,
        sizeBytes: fileRecord.fileSizeBytes,
      },
      exifData,
      manipulationAnalysis: manipulationResults,
      aiDetection: aiResults,
      errorLevelAnalysis: {
        ...elaResults,
        elaHeatmapUrl: `${reqHost}/uploads/${elaResults.elaHeatmapFileName}`,
      },
      overallTrustScore: trustScore,
      riskCategory,
    };
  }
}

module.exports = ImageService;
