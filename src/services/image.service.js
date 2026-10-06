const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ExifParser = require('exif-parser');
const UploadedFile = require('../models/UploadedFile');
const Analysis = require('../models/Analysis');
const History = require('../models/History');
const AppError = require('../utils/appError');
const { HTTP_STATUS } = require('../constants');
const { EvidenceBuilder, EvidenceAggregator, CATEGORIES, ASSESSMENTS, SOURCES } = require('./evidence');
const AIImageDetector = require('./aiImageDetector.service');

/**
 * Service Layer for Advanced Image Forensics, EXIF Analysis, AI Image Detection, and ELA
 * Enforces the core TrustGraph business rule: DETECTION !== DANGER.
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
   * 2. Image Provenance Assessment
   */
  static evaluateProvenance(exifData) {
    const signals = [];
    if (!exifData.hasExifData) {
      signals.push('EXIF metadata unavailable or stripped.');
    }
    if (exifData.hasExifData && !exifData.dateTimeOriginal) {
      signals.push('Original camera creation timestamp unavailable.');
    }
    if (exifData.hasExifData && !exifData.make && !exifData.model) {
      signals.push('Physical camera hardware Make and Model tags unavailable.');
    }

    const hasHardware = exifData.make || exifData.model;
    const status = hasHardware && exifData.dateTimeOriginal ? 'VERIFIED' : exifData.hasExifData ? 'LIMITED' : 'UNVERIFIED';
    const confidence = hasHardware ? 0.92 : 0.65;

    return {
      status,
      confidence,
      signals: signals.length > 0 ? signals : ['Complete camera sensor hardware provenance verified.'],
    };
  }

  /**
   * 3. Image Manipulation Assessment
   */
  static detectImageManipulation(exifData, sharpMeta, elaResults) {
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

    let manipulationScore = 0;
    const signals = [];

    const softwareString = (exifData.software || '').toLowerCase();
    const detectedSoftware = editingSoftwareKeywords.find((kw) => softwareString.includes(kw));

    if (detectedSoftware) {
      manipulationScore += 45;
      signals.push({
        type: 'editing_software_signature',
        severity: 'medium',
        confidence: 0.90,
        weight: 0.45,
        description: `EXIF Software tag matches editing tool: "${exifData.software}"`,
        source: 'metadata',
      });
    }

    if (elaResults && elaResults.calculated && elaResults.highErrorThresholdExceeded) {
      manipulationScore += 35;
      signals.push({
        type: 'ela_compression_anomaly',
        severity: 'medium',
        confidence: 0.75,
        weight: 0.35,
        description: `Error Level Analysis (ELA) detected compression grid anomalies (Avg Error: ${elaResults.averageErrorLevel}).`,
        source: 'forensics',
      });
    }

    manipulationScore = Math.min(100, manipulationScore);
    const likelihood = parseFloat((manipulationScore / 100).toFixed(2));

    let classification = 'UNLIKELY';
    if (likelihood >= 0.70) classification = 'HIGH';
    else if (likelihood >= 0.35) classification = 'POSSIBLE';

    return {
      detected: likelihood >= 0.35,
      likelihood,
      confidence: 0.78,
      classification,
      detectedSoftware: detectedSoftware || null,
      signals,
    };
  }

  /**
   * 4. Multi-Signal AI-Generated Image Detection
   */
  /**
   * 4. Multi-Signal AI-Generated Image Detection
   */
  static detectAiGeneratedImage(exifData, sharpMeta, fileBuffer = null) {
    let aiProbability = 0.0;
    const signals = [];

    const aiSoftwareKeywords = [
      'c2pa',
      'chatgpt',
      'dall-e',
      'dalle',
      'openai',
      'midjourney',
      'stable diffusion',
      'novelai',
      'automatic1111',
      'comfyui',
      'bing image creator',
      'firefly',
      'flux',
      'sdxl',
    ];

    // 1. Scan EXIF Software Tag, Raw File Buffer & Chunk Metadata for C2PA or AI Signatures
    let detectedSoftwareTag = (exifData?.software || '').toLowerCase();
    let detectedAiTool = aiSoftwareKeywords.find((kw) => detectedSoftwareTag.includes(kw));

    // Scan raw buffer header (first 150KB) for PNG tEXt chunks, C2PA manifests, or embedded tool declarations
    if (!detectedAiTool && fileBuffer) {
      const headerStr = fileBuffer.toString('utf-8', 0, Math.min(fileBuffer.length, 150000)).toLowerCase();
      detectedAiTool = aiSoftwareKeywords.find((kw) => headerStr.includes(kw));
      if (detectedAiTool) {
        detectedSoftwareTag = `Metadata chunk: "${detectedAiTool}"`;
      }
    }

    if (!detectedAiTool && sharpMeta) {
      const sharpStr = JSON.stringify(sharpMeta).toLowerCase();
      detectedAiTool = aiSoftwareKeywords.find((kw) => sharpStr.includes(kw));
      if (detectedAiTool) {
        detectedSoftwareTag = `Image properties: "${detectedAiTool}"`;
      }
    }

    if (detectedAiTool) {
      aiProbability = 0.95;
      signals.push({
        type: 'ai_software_signature',
        severity: 'very_high',
        confidence: 0.99,
        weight: 0.80,
        description: `Embedded metadata or C2PA manifest matches AI generator / framework signature ("${detectedAiTool}").`,
        source: 'metadata',
      });
    }

    // 2. Physical Camera Hardware Provenance Signal
    const hasCameraHardware = !!(exifData?.make || exifData?.model || exifData?.iso || exifData?.focalLength || exifData?.exposureTime);
    if (hasCameraHardware) {
      // Physical camera sensor detected - reduce synthetic likelihood
      aiProbability = Math.max(0, aiProbability - 0.20);
      signals.push({
        type: 'camera_hardware_provenance',
        severity: 'low',
        confidence: 0.90,
        weight: 0.20,
        description: `Physical camera hardware verified (${exifData.make || ''} ${exifData.model || ''}).`,
        source: 'metadata',
      });
    }

    // 3. Latent Generator Grid & Resolution Heuristics
    const width = sharpMeta?.width || 0;
    const height = sharpMeta?.height || 0;
    const isStandardAiResolution =
      (width === 1024 && height === 1024) ||
      (width === 512 && height === 512) ||
      (width === 1024 && height === 1792) ||
      (width === 1792 && height === 1024) ||
      (width === 1536 && height === 1024) ||
      (width === 1024 && height === 1536) ||
      (width === 1152 && height === 896) ||
      (width === 896 && height === 1152) ||
      (width === 1344 && height === 768) ||
      (width === 768 && height === 1344) ||
      (width === 1456 && height === 816) ||
      (width === 1672 && height === 941);

    const isLatentGridMultiple = (width % 64 === 0 && height % 64 === 0 && width >= 512 && height >= 512);

    if ((isStandardAiResolution || isLatentGridMultiple) && !hasCameraHardware) {
      if (!detectedAiTool) {
        aiProbability += 0.30;
      }
      signals.push({
        type: 'standard_ai_resolution',
        severity: 'medium',
        confidence: 0.65,
        weight: 0.30,
        description: `Image dimensions match latent generator tensor grid (${width}x${height}). (Heuristic signal)`,
        source: 'heuristic',
      });
    }

    aiProbability = Math.min(0.99, parseFloat(Math.max(0.0, aiProbability).toFixed(2)));

    let classification = 'INCONCLUSIVE';
    if (aiProbability >= 0.75) {
      classification = 'LIKELY_AI_GENERATED';
    } else if (aiProbability >= 0.35) {
      classification = 'SUSPICIOUS';
    } else if (hasCameraHardware) {
      classification = 'UNLIKELY';
    } else {
      classification = 'INCONCLUSIVE';
    }

    const detected = classification === 'LIKELY_AI_GENERATED';

    return {
      detected,
      likelihood: aiProbability,
      confidence: detectedAiTool ? 0.99 : hasCameraHardware ? 0.90 : 0.60,
      classification,
      method: 'multi_signal_forensics',
      signals,
    };
  }

  /**
   * 5. Perform Error Level Analysis (ELA)
   */
  static async performErrorLevelAnalysis(filePath, fileName) {
    try {
      if (!fs.existsSync(filePath)) {
        return {
          calculated: false,
          averageErrorLevel: 0,
          highErrorThresholdExceeded: false,
          statistics: { minError: 0, maxError: 0, meanError: 0, stdDeviation: 0, p95: 0, p99: 0 },
          visualization: { method: 'JPEG recompression analysis', recompressionQuality: 95, normalization: 'None', scaleFactor: 1.0 },
          elaHeatmapFileName: '',
          elaDataUrl: '',
          elaScaleFactor: 1.0,
          error: 'Image file not found on disk.',
        };
      }

      const originalSharp = sharp(filePath);
      const originalJpegBuffer = await originalSharp
        .removeAlpha()
        .toColourspace('srgb')
        .jpeg({ quality: 100 })
        .toBuffer();

      const resavedJpegBuffer = await sharp(originalJpegBuffer)
        .removeAlpha()
        .toColourspace('srgb')
        .jpeg({ quality: 95 })
        .toBuffer();

      const rawOriginal = await sharp(originalJpegBuffer)
        .removeAlpha()
        .toColourspace('srgb')
        .raw()
        .toBuffer({ resolveWithObject: true });

      const rawResaved = await sharp(resavedJpegBuffer)
        .resize(rawOriginal.info.width, rawOriginal.info.height)
        .removeAlpha()
        .toColourspace('srgb')
        .raw()
        .toBuffer({ resolveWithObject: true });

      const width = rawOriginal.info.width;
      const height = rawOriginal.info.height;
      const totalPixels = width * height || 1;

      const len = Math.min(rawOriginal.data.length, rawResaved.data.length);
      const errors = new Float32Array(totalPixels);
      const diffRArr = new Uint8Array(totalPixels);
      const diffGArr = new Uint8Array(totalPixels);
      const diffBArr = new Uint8Array(totalPixels);

      let totalError = 0;
      let minError = 255;
      let maxError = 0;
      let pixelIdx = 0;

      for (let i = 0; i < len; i += 3) {
        const r1 = rawOriginal.data[i] || 0;
        const r2 = rawResaved.data[i] || 0;
        const g1 = rawOriginal.data[i + 1] || 0;
        const g2 = rawResaved.data[i + 1] || 0;
        const b1 = rawOriginal.data[i + 2] || 0;
        const b2 = rawResaved.data[i + 2] || 0;

        const dR = Math.abs(r1 - r2);
        const dG = Math.abs(g1 - g2);
        const dB = Math.abs(b1 - b2);

        diffRArr[pixelIdx] = dR;
        diffGArr[pixelIdx] = dG;
        diffBArr[pixelIdx] = dB;

        const pErr = (dR + dG + dB) / 3;
        errors[pixelIdx] = pErr;

        totalError += pErr;
        if (pErr < minError) minError = pErr;
        if (pErr > maxError) maxError = pErr;

        pixelIdx++;
      }

      const meanError = parseFloat((totalError / totalPixels).toFixed(2)) || 0.0;

      let varianceSum = 0;
      for (let i = 0; i < totalPixels; i++) {
        varianceSum += Math.pow(errors[i] - meanError, 2);
      }
      const stdDeviation = parseFloat(Math.sqrt(varianceSum / totalPixels).toFixed(2));

      const sortedSamples = Array.from(errors.subarray(0, Math.min(totalPixels, 50000))).sort((a, b) => a - b);
      const sampleCount = sortedSamples.length || 1;
      const p95 = parseFloat((sortedSamples[Math.floor(sampleCount * 0.95)] || meanError * 2).toFixed(2));
      const p99 = parseFloat((sortedSamples[Math.floor(sampleCount * 0.99)] || meanError * 4).toFixed(2));

      const visualizationCeiling = Math.max(1.0, p99);
      const scaleMultiplier = 255 / visualizationCeiling;
      const elaBuffer = Buffer.alloc(width * height * 3);

      let outIdx = 0;
      for (let i = 0; i < totalPixels; i++) {
        elaBuffer[outIdx] = Math.min(255, Math.round(diffRArr[i] * scaleMultiplier));
        elaBuffer[outIdx + 1] = Math.min(255, Math.round(diffGArr[i] * scaleMultiplier));
        elaBuffer[outIdx + 2] = Math.min(255, Math.round(diffBArr[i] * scaleMultiplier));
        outIdx += 3;
      }

      const elaFileName = `ela-${fileName}`;
      const elaFilePath = path.join(__dirname, '../uploads', elaFileName);

      const elaJpegBuffer = await sharp(elaBuffer, {
        raw: { width, height, channels: 3 },
      })
        .jpeg({ quality: 95 })
        .toBuffer();

      fs.writeFileSync(elaFilePath, elaJpegBuffer);
      const elaDataUrl = `data:image/jpeg;base64,${elaJpegBuffer.toString('base64')}`;

      return {
        calculated: true,
        averageErrorLevel: meanError,
        highErrorThresholdExceeded: meanError > 12.0,
        statistics: {
          minError: parseFloat(minError.toFixed(2)),
          maxError: parseFloat(maxError.toFixed(2)),
          meanError,
          stdDeviation,
          p95,
          p99,
        },
        visualization: {
          method: 'JPEG recompression analysis',
          recompressionQuality: 95,
          normalization: 'P99 Percentile Dynamic Scaling',
          scaleFactor: parseFloat(scaleMultiplier.toFixed(1)),
        },
        elaHeatmapFileName: elaFileName,
        elaDataUrl,
        elaScaleFactor: parseFloat(scaleMultiplier.toFixed(1)),
      };
    } catch (err) {
      return {
        calculated: false,
        averageErrorLevel: 0,
        highErrorThresholdExceeded: false,
        statistics: { minError: 0, maxError: 0, meanError: 0, stdDeviation: 0, p95: 0, p99: 0 },
        visualization: { method: 'JPEG recompression analysis', recompressionQuality: 95, normalization: 'None', scaleFactor: 1.0 },
        elaHeatmapFileName: '',
        elaDataUrl: '',
        elaScaleFactor: 1.0,
        error: `ELA processing skipped: ${err.message}`,
      };
    }
  }

  /**
   * 6. Independent Security Risk Assessment
   * Enforces: EDITED !== MALICIOUS and AI_GENERATED !== MALICIOUS.
   */
  static evaluateImageSecurityRisk(fileBuffer, sharpMeta, exifData, aiAssessment, manipulationAssessment) {
    let riskScore = 0;
    const reasons = [];
    const recommendations = [];

    // Check for polyglot markers (embedded ZIP or script tags inside image comment segments)
    const fileHeaderHex = fileBuffer.slice(0, 16).toString('hex').toLowerCase();
    const textBuffer = fileBuffer.toString('utf-8', 0, Math.min(fileBuffer.length, 10000)).toLowerCase();

    if (textBuffer.includes('<script') || textBuffer.includes('javascript:') || textBuffer.includes('<?php')) {
      riskScore += 70;
      reasons.push('CRITICAL: Embedded script execution code detected inside image comment segment.');
      recommendations.push('Do not render or serve raw image directly; sanitize file headers and re-encode buffer.');
    }

    if (fileHeaderHex.includes('504b0304') && !fileHeaderHex.startsWith('89504e47')) {
      riskScore += 50;
      reasons.push('HIGH: Polyglot file structure (ZIP signature detected inside image binary).');
      recommendations.push('Inspect file with binary disassembler to verify absence of steganographic archive payloads.');
    }

    // Authenticity Warning (NOT Malicious Danger)
    if (aiAssessment.detected || manipulationAssessment.detected) {
      riskScore += 15;
      reasons.push('Image shows evidence of digital manipulation or AI generation.');
      recommendations.push('AI-generated or edited images are not inherently malicious. Verify image provenance and context before using for official decisions.');
    }

    if (reasons.length === 0) {
      reasons.push('Zero polyglot executable signatures or embedded script payloads detected.');
      recommendations.push('Image meets standard binary security specifications.');
    }

    let riskLevel = 'LOW';
    if (riskScore >= 65) riskLevel = 'CRITICAL';
    else if (riskScore >= 40) riskLevel = 'HIGH';
    else if (riskScore >= 20) riskLevel = 'MEDIUM';

    return {
      riskLevel,
      riskScore: Math.min(100, riskScore),
      reasons,
      recommendations,
    };
  }

  /**
   * Master Image Analysis Orchestration Pipeline.
   */
  static async analyzeImage(fileId, userId, reqHost = '') {
    let fileRecord;
    let fileBuffer;

    if (typeof fileId === 'object' && fileId !== null && fileId.filePath) {
      fileRecord = fileId;
      fileBuffer = userId instanceof Buffer ? userId : fs.readFileSync(fileRecord.filePath);
    } else {
      fileRecord = await UploadedFile.findOne({ _id: fileId, userId });
      if (!fileRecord) {
        throw new AppError('Image file not found or access denied.', HTTP_STATUS.NOT_FOUND);
      }

      if (!fs.existsSync(fileRecord.filePath)) {
        throw new AppError('Image file is no longer available on disk. Please re-upload the image.', HTTP_STATUS.NOT_FOUND);
      }

      fileBuffer = fs.readFileSync(fileRecord.filePath);
    }

    const sharpInstance = sharp(fileRecord.filePath);
    const sharpMeta = await sharpInstance.metadata();

    // 1. EXIF Metadata
    const exifData = this.extractExifMetadata(fileBuffer);

    // 2. Provenance
    const provenanceAssessment = this.evaluateProvenance(exifData);

    // 3. ELA Analysis
    const elaResults = await this.performErrorLevelAnalysis(fileRecord.filePath, fileRecord.fileName);

    // 4. Manipulation Assessment
    const manipulationAssessment = this.detectImageManipulation(exifData, sharpMeta, elaResults);

    // 5. AI Generation Assessment (Forensics & Heuristics)
    const aiAssessment = this.detectAiGeneratedImage(exifData, sharpMeta, fileBuffer);

    // 6. Trained Neural Network AI Detector Inference (ONNX Engine)
    const aiModelDetector = await AIImageDetector.detect(fileBuffer);

    // 7. Independent Risk Assessment
    const riskAssessment = this.evaluateImageSecurityRisk(fileBuffer, sharpMeta, exifData, aiAssessment, manipulationAssessment);

    // Combine Signals
    const signals = [
      ...aiAssessment.signals,
      ...manipulationAssessment.signals,
    ];

    const positiveFactors = [];
    const negativeFactors = [];

    const hasCameraHardware = !!(exifData.make || exifData.model || exifData.iso || exifData.focalLength);
    if (provenanceAssessment.status === 'VERIFIED' && hasCameraHardware) {
      positiveFactors.push('Full camera sensor EXIF provenance verified.');
    }
    if (hasCameraHardware && !aiAssessment.detected && aiAssessment.likelihood < 0.30) {
      positiveFactors.push('Image exhibits physical camera sensor characteristics.');
    }
    if (manipulationAssessment.detected) {
      negativeFactors.push(`Editing traces detected (Software: ${manipulationAssessment.detectedSoftware || 'Generic'}).`);
    }
    if (aiAssessment.detected || aiAssessment.likelihood >= 0.55) {
      negativeFactors.push(`High AI-generation likelihood (${(aiAssessment.likelihood * 100).toFixed(0)}%).`);
    } else if (aiAssessment.likelihood >= 0.35) {
      negativeFactors.push(`Inconclusive provenance — medium AI likelihood (${(aiAssessment.likelihood * 100).toFixed(0)}%).`);
    }

    // Trust Score Synthesis (0 - 100)
    let trustScore = 100.0;
    if (aiAssessment.classification === 'LIKELY_AI_GENERATED') {
      trustScore -= (aiAssessment.likelihood * 60.0);
    } else if (aiAssessment.classification === 'SUSPICIOUS') {
      trustScore -= (aiAssessment.likelihood * 30.0);
    }
    if (aiModelDetector.detectorStatus === 'AVAILABLE' && aiModelDetector.aiGeneratedProbability) {
      trustScore -= (aiModelDetector.aiGeneratedProbability * 40.0);
    }
    trustScore -= (manipulationAssessment.likelihood * 25.0);
    if (riskAssessment.riskScore > 20) trustScore -= (riskAssessment.riskScore * 0.3);
    if (provenanceAssessment.status === 'UNVERIFIED') trustScore -= 5.0;

    trustScore = Math.max(0.0, Math.min(100.0, parseFloat(trustScore.toFixed(1))));

    const confidenceScore = parseFloat(((aiAssessment.confidence + manipulationAssessment.confidence + provenanceAssessment.confidence) / 3).toFixed(2));
    const riskCategory = riskAssessment.riskLevel.toLowerCase();

    // Construct Standardized Evidence Items
    const aiEvidence = EvidenceBuilder.create({
      signal: 'IMAGE_AI_GENERATION',
      category: CATEGORIES.IMAGE_AI_GENERATION,
      assessment: aiAssessment.classification === 'LIKELY_AI_GENERATED'
        ? ASSESSMENTS.LIKELY_AI_GENERATED
        : aiAssessment.classification === 'SUSPICIOUS'
        ? ASSESSMENTS.SUSPICIOUS
        : aiAssessment.classification === 'UNLIKELY'
        ? ASSESSMENTS.PASS
        : ASSESSMENTS.INCONCLUSIVE,
      value: aiAssessment.likelihood,
      confidence: aiAssessment.confidence,
      source: aiAssessment.signals.some((s) => s.type === 'ai_software_signature') ? SOURCES.C2PA : SOURCES.HEURISTIC,
      evidence: aiAssessment.signals.map((s) => s.description),
      rawSignal: {
        detected: aiAssessment.detected,
        likelihood: aiAssessment.likelihood,
        classification: aiAssessment.classification,
        method: aiAssessment.method,
        signals: aiAssessment.signals,
      },
      detectorVersion: '1.0.0',
      modelVersion: 'forensics-multi-signal-v1',
    });

    const trainedModelEvidence = EvidenceBuilder.create({
      signal: 'AI_IMAGE_CLASSIFIER',
      category: CATEGORIES.IMAGE_AI_GENERATION,
      assessment: aiModelDetector.classification,
      value: aiModelDetector.aiGeneratedProbability !== null ? aiModelDetector.aiGeneratedProbability : 0.0,
      confidence: aiModelDetector.confidence,
      source: SOURCES.MODEL,
      evidence: aiModelDetector.evidence,
      rawSignal: aiModelDetector,
      detectorVersion: '1.0.0',
      modelVersion: aiModelDetector.modelVersion,
    });

    const manipulationEvidence = EvidenceBuilder.create({
      signal: 'IMAGE_MANIPULATION',
      category: CATEGORIES.IMAGE_MANIPULATION,
      assessment: manipulationAssessment.classification === 'HIGH'
        ? ASSESSMENTS.HIGH_RISK
        : manipulationAssessment.classification === 'POSSIBLE'
        ? ASSESSMENTS.SUSPICIOUS
        : ASSESSMENTS.PASS,
      value: manipulationAssessment.likelihood,
      confidence: manipulationAssessment.confidence,
      source: manipulationAssessment.detectedSoftware ? SOURCES.METADATA : SOURCES.FORENSICS,
      evidence: manipulationAssessment.signals.map((s) => s.description),
      rawSignal: {
        detected: manipulationAssessment.detected,
        likelihood: manipulationAssessment.likelihood,
        classification: manipulationAssessment.classification,
        detectedSoftware: manipulationAssessment.detectedSoftware,
        signals: manipulationAssessment.signals,
      },
      detectorVersion: '1.0.0',
      modelVersion: 'ela-recompression-v1',
    });

    const provenanceEvidence = EvidenceBuilder.create({
      signal: 'IMAGE_PROVENANCE',
      category: CATEGORIES.IMAGE_PROVENANCE,
      assessment: provenanceAssessment.status === 'VERIFIED'
        ? ASSESSMENTS.PASS
        : provenanceAssessment.status === 'LIMITED'
        ? ASSESSMENTS.SUSPICIOUS
        : ASSESSMENTS.INCONCLUSIVE,
      value: provenanceAssessment.status === 'VERIFIED' ? 1.0 : provenanceAssessment.status === 'LIMITED' ? 0.5 : 0.0,
      confidence: provenanceAssessment.confidence,
      source: SOURCES.METADATA,
      evidence: provenanceAssessment.signals,
      rawSignal: {
        status: provenanceAssessment.status,
        confidence: provenanceAssessment.confidence,
        signals: provenanceAssessment.signals,
      },
      detectorVersion: '1.0.0',
    });

    const metadataEvidence = EvidenceBuilder.create({
      signal: 'IMAGE_METADATA',
      category: CATEGORIES.IMAGE_METADATA,
      assessment: exifData.hasExifData ? ASSESSMENTS.PASS : ASSESSMENTS.LOW_RISK,
      value: exifData.hasExifData ? 1.0 : 0.0,
      confidence: 0.95,
      source: SOURCES.METADATA,
      evidence: exifData.hasExifData
        ? [
            'EXIF metadata tags present.',
            exifData.make ? `Make: ${exifData.make}` : null,
            exifData.model ? `Model: ${exifData.model}` : null,
            exifData.software ? `Software: ${exifData.software}` : null,
          ].filter(Boolean)
        : ['EXIF metadata stripped or missing.'],
      rawSignal: {
        hasExifData: exifData.hasExifData,
        make: exifData.make || null,
        model: exifData.model || null,
        software: exifData.software || null,
      },
      detectorVersion: '1.0.0',
    });

    const securityEvidence = EvidenceBuilder.create({
      signal: 'IMAGE_SECURITY',
      category: CATEGORIES.IMAGE_SECURITY,
      assessment: riskAssessment.riskLevel === 'CRITICAL' || riskAssessment.riskLevel === 'HIGH'
        ? ASSESSMENTS.HIGH_RISK
        : riskAssessment.riskLevel === 'MEDIUM'
        ? ASSESSMENTS.SUSPICIOUS
        : ASSESSMENTS.PASS,
      value: parseFloat((riskAssessment.riskScore / 100).toFixed(2)),
      confidence: 0.90,
      source: SOURCES.HEURISTIC,
      evidence: riskAssessment.reasons,
      rawSignal: {
        riskLevel: riskAssessment.riskLevel,
        riskScore: riskAssessment.riskScore,
        reasons: riskAssessment.reasons,
        recommendations: riskAssessment.recommendations,
      },
      detectorVersion: '1.0.0',
    });

    const evidenceList = [aiEvidence, trainedModelEvidence, manipulationEvidence, provenanceEvidence, metadataEvidence, securityEvidence];
    const evidenceSummary = EvidenceAggregator.aggregate(evidenceList);

    // Create Analysis Record in MongoDB if valid userId provided
    let analysisId = null;
    const mongoose = require('mongoose');

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      try {
        const analysisRecord = await Analysis.create({
          userId,
          targetEntity: fileRecord.originalName || fileRecord.fileName || 'uploaded_image',
          entityType: 'content',
          trustScore,
          confidenceScore,
          status: 'completed',
          riskCategory,
          evidenceList,
          insights: [
            `Dimensions: ${sharpMeta.width}x${sharpMeta.height} (${sharpMeta.format.toUpperCase()}).`,
            aiAssessment.detected
              ? `AI DETECTED: ${aiAssessment.classification} likelihood of AI generation (${(aiAssessment.likelihood * 100).toFixed(0)}%).`
              : 'AI CLEAN: Image exhibits physical sensor characteristics.',
            manipulationAssessment.detected
              ? `MANIPULATION: Digital editing software traces detected (${manipulationAssessment.classification}).`
              : 'MANIPULATION CLEAN: No explicit digital editing software signatures found.',
            `Risk Level: ${riskAssessment.riskLevel}.`,
            `AI Neural Model: ${aiModelDetector.detectorStatus}`,
          ],
          graphMetadata: {
            nodeCount: sharpMeta.width * sharpMeta.height,
            edgeCount: Math.round(elaResults.averageErrorLevel),
            centralityScore: trustScore / 100,
            elaFileName: elaResults.elaHeatmapFileName,
          },
        });

        analysisId = analysisRecord._id;

        // History audit event
        await History.create({
          userId,
          action: 'ANALYSIS_RUN',
          entityId: analysisRecord._id,
          entityType: 'Analysis',
          details: {
            fileName: fileRecord.originalName || fileRecord.fileName,
            trustScore,
            riskCategory,
          },
        });

        // Notification
        const NotificationService = require('./notification.service');
        const isCritical = riskAssessment.riskLevel === 'CRITICAL' || riskAssessment.riskLevel === 'HIGH';
        await NotificationService.createNotification({
          userId,
          type: isCritical ? 'CRITICAL_THREAT' : 'ANALYSIS_COMPLETE',
          title: `Image Forensics: ${fileRecord.originalName || fileRecord.fileName}`,
          message: `Image analysis finished. Trust Score: ${trustScore}% (${riskAssessment.riskLevel} risk). ${aiAssessment.detected ? 'AI likelihood detected.' : ''}`,
          severity: isCritical ? 'critical' : riskAssessment.riskLevel === 'MEDIUM' ? 'warning' : 'success',
          entityId: analysisRecord._id,
        });
      } catch (dbErr) {
        console.error('[ImageService] DB Audit record creation bypassed:', dbErr.message);
      }
    }

    return {
      analysisId,
      fileInfo: {
        originalName: fileRecord.originalName || fileRecord.fileName,
        width: sharpMeta.width,
        height: sharpMeta.height,
        format: sharpMeta.format,
        sizeBytes: fileRecord.fileSizeBytes,
      },
      exifData,
      aiModelDetector,
      aiGenerationAssessment: aiAssessment,
      manipulationAssessment,
      provenanceAssessment,
      riskAssessment,
      errorLevelAnalysis: {
        ...elaResults,
        elaHeatmapUrl: `${reqHost}/uploads/${elaResults.elaHeatmapFileName}`,
      },
      signals,
      positiveFactors,
      negativeFactors,
      recommendations: riskAssessment.recommendations,
      overallTrustScore: trustScore,
      confidenceScore,
      riskCategory,
      // Standardized Evidence Layer
      evidences: evidenceList,
      evidence: evidenceList,
      evidenceSummary,
    };
  }
}

module.exports = ImageService;
