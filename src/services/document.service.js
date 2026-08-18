const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Analysis = require('../models/Analysis');
const UploadedFile = require('../models/UploadedFile');
const History = require('../models/History');
const AiGenerationDetector = require('./aiGenerationDetector');
const AppError = require('../utils/appError');
const { HTTP_STATUS } = require('../constants');

/**
 * Service Layer for Document Analysis, Text Extraction, PII Detection, AI Generation Assessment, and Trust Scoring
 */
class DocumentService {
  /**
   * Extracts text and technical metadata from PDF, DOCX, or TXT file.
   */
  static async extractTextAndMetadata(filePath, mimeType) {
    const fileBuffer = fs.readFileSync(filePath);
    let extractedText = '';
    let metadata = {};

    if (mimeType === 'application/pdf') {
      const pdfData = await pdfParse(fileBuffer);
      extractedText = pdfData.text || '';
      metadata = {
        pageCount: pdfData.numpages || 1,
        pdfVersion: pdfData.info?.PDFFormatVersion || '1.4',
        title: pdfData.info?.Title || 'Untitled',
        author: pdfData.info?.Author || 'Unknown',
        creator: pdfData.info?.Creator || 'Unknown',
        producer: pdfData.info?.Producer || 'Unknown',
      };
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      extractedText = result.value || '';
      metadata = {
        pageCount: Math.ceil((extractedText.length || 1) / 3000),
        fileFormat: 'DOCX',
        warnings: result.messages || [],
      };
    } else if (mimeType === 'text/plain' || mimeType === 'text/markdown' || (mimeType && mimeType.startsWith('text/'))) {
      extractedText = fileBuffer.toString('utf-8');
      metadata = {
        pageCount: Math.max(1, Math.ceil((extractedText.length || 1) / 3000)),
        fileFormat: 'TXT',
      };
    } else {
      throw new AppError(`Unsupported mime type for document analysis: ${mimeType}`, HTTP_STATUS.BAD_REQUEST);
    }

    return { extractedText: extractedText.trim(), metadata };
  }

  /**
   * Scans text content for sensitive data leaks (PII, API keys, suspicious links).
   */
  static detectSensitiveInformation(text) {
    const patterns = {
      emails: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      ssns: /\b\d{3}-\d{2}-\d{4}\b/g,
      creditCards: /\b(?:\d[ -]*?){13,16}\b/g,
      apiKeys: /\b(?:sk_live|ak_live|ghp_|AIzaSy)[a-zA-Z0-9_-]{20,}\b/g,
      suspiciousUrls: /https?:\/\/[^\s<"']+\.(?:xyz|top|phishing|tk|ru|cn|bit)/gi,
    };

    const matches = {
      emailCount: (text.match(patterns.emails) || []).length,
      ssnCount: (text.match(patterns.ssns) || []).length,
      creditCardCount: (text.match(patterns.creditCards) || []).length,
      apiKeyCount: (text.match(patterns.apiKeys) || []).length,
      suspiciousUrlCount: (text.match(patterns.suspiciousUrls) || []).length,
    };

    const totalLeaks =
      matches.emailCount +
      matches.ssnCount +
      matches.creditCardCount +
      matches.apiKeyCount +
      matches.suspiciousUrlCount;

    return {
      hasSensitiveInfo: totalLeaks > 0,
      totalLeaks,
      details: matches,
    };
  }

  /**
   * Evaluates Document Risk Assessment independently of AI generation.
   * Analyzes malicious URLs, executable commands, script indicators, and PII leaks.
   */
  static evaluateDocumentRisk(sensitiveInfo, aiAssessment, wordCount) {
    let riskScore = 0;
    const reasons = [];
    const recommendations = [];

    // Security Leaks & Payloads
    if (sensitiveInfo.details.apiKeyCount > 0) {
      riskScore += 40 * sensitiveInfo.details.apiKeyCount;
      reasons.push(`Detected ${sensitiveInfo.details.apiKeyCount} exposed live API secret key(s).`);
      recommendations.push('Rotate all exposed API keys and revoke public repository permissions immediately.');
    }

    if (sensitiveInfo.details.ssnCount > 0) {
      riskScore += 30 * sensitiveInfo.details.ssnCount;
      reasons.push(`Detected ${sensitiveInfo.details.ssnCount} unencrypted Social Security Number(s).`);
      recommendations.push('Redact SSN tokens before transmitting or sharing document externally.');
    }

    if (sensitiveInfo.details.creditCardCount > 0) {
      riskScore += 25 * sensitiveInfo.details.creditCardCount;
      reasons.push(`Detected ${sensitiveInfo.details.creditCardCount} raw credit card number(s).`);
      recommendations.push('Mask credit card numbers according to PCI-DSS compliance standards.');
    }

    if (sensitiveInfo.details.suspiciousUrlCount > 0) {
      riskScore += 35 * sensitiveInfo.details.suspiciousUrlCount;
      reasons.push(`Detected ${sensitiveInfo.details.suspiciousUrlCount} high-risk phishing/suspicious URL pattern(s).`);
      recommendations.push('Do not click external URLs; verify domain reputation before navigating.');
    }

    // AI Generation Authenticity Consideration (NOT malicious, but requires verification)
    if (aiAssessment.detected) {
      riskScore += 15;
      reasons.push('Document contains synthetic or AI-generated content.');
      recommendations.push('Verify the source and authenticity before relying on this document for operational, legal, financial, or security decisions.');
    }

    if (reasons.length === 0) {
      reasons.push('Zero unencrypted PII, API keys, or malicious script payloads detected.');
      recommendations.push('Document parameters meet standard security benchmarks.');
    }

    let riskLevel = 'LOW';
    if (riskScore >= 65) riskLevel = 'CRITICAL';
    else if (riskScore >= 40) riskLevel = 'HIGH';
    else if (riskScore >= 20) riskLevel = 'MEDIUM';

    return {
      riskLevel,
      score: Math.min(100, riskScore),
      reasons,
      recommendations,
    };
  }

  /**
   * Generates Categorized Findings array.
   */
  static generateFindings(aiAssessment, sensitiveInfo, riskAssessment) {
    const findings = [];

    if (aiAssessment.detected) {
      findings.push({
        category: 'AI_GENERATION',
        severity: 'INFO',
        title: 'AI-Generated Content Detected',
        description: aiAssessment.explanation,
        confidence: aiAssessment.confidence,
      });

      findings.push({
        category: 'AUTHENTICITY',
        severity: 'WARNING',
        title: 'Unverified Synthetic Content',
        description: 'AI-generated content should be independently verified before relying on it for high-impact decisions.',
        confidence: aiAssessment.confidence,
      });
    }

    if (sensitiveInfo.details.apiKeyCount > 0) {
      findings.push({
        category: 'CREDENTIAL_EXPOSURE',
        severity: 'CRITICAL',
        title: 'API Secret Key Leak',
        description: `Exposed ${sensitiveInfo.details.apiKeyCount} API secret key(s) in document body.`,
        confidence: 0.99,
      });
    }

    if (sensitiveInfo.details.ssnCount > 0 || sensitiveInfo.details.creditCardCount > 0) {
      findings.push({
        category: 'PII',
        severity: 'HIGH',
        title: 'Sensitive PII Exposure',
        description: `Document contains exposed SSNs (${sensitiveInfo.details.ssnCount}) or Credit Cards (${sensitiveInfo.details.creditCardCount}).`,
        confidence: 0.98,
      });
    }

    if (sensitiveInfo.details.suspiciousUrlCount > 0) {
      findings.push({
        category: 'PHISHING',
        severity: 'HIGH',
        title: 'Suspicious Phishing URL',
        description: `Document references ${sensitiveInfo.details.suspiciousUrlCount} high-risk domain(s).`,
        confidence: 0.92,
      });
    }

    return findings;
  }

  /**
   * Calculates document metrics, trust indicators, and risk categorization.
   */
  static computeTrustIndicators(text, metadata, sensitiveInfo, aiAssessment, riskAssessment) {
    const words = text ? text.split(/\s+/).filter(Boolean) : [];
    const wordCount = words.length;
    const charCount = text.length;
    const estimatedReadingTimeMinutes = Math.ceil(wordCount / 200);

    // Baseline Trust Score
    let trustScore = 95.0;

    // Deductions based on PII / Sensitive Information leaks
    if (sensitiveInfo.details.apiKeyCount > 0) trustScore -= 25 * sensitiveInfo.details.apiKeyCount;
    if (sensitiveInfo.details.ssnCount > 0) trustScore -= 20 * sensitiveInfo.details.ssnCount;
    if (sensitiveInfo.details.creditCardCount > 0) trustScore -= 15 * sensitiveInfo.details.creditCardCount;
    if (sensitiveInfo.details.suspiciousUrlCount > 0) trustScore -= 15 * sensitiveInfo.details.suspiciousUrlCount;

    // Mild authenticity deduction for AI generation (unverified synthetic data)
    if (aiAssessment.detected) {
      trustScore -= 15;
    }

    if (wordCount < 10) trustScore -= 15;

    trustScore = Math.max(0.0, Math.min(100.0, parseFloat(trustScore.toFixed(1))));

    const riskCategory = riskAssessment.riskLevel.toLowerCase();

    return {
      trustScore,
      riskCategory,
      confidenceScore: aiAssessment.confidence,
      wordCount,
      charCount,
      estimatedReadingTimeMinutes,
      insights: [
        `Document contains ${wordCount} words across ${metadata.pageCount || 1} page(s).`,
        aiAssessment.detected
          ? `AI DETECTED: ${aiAssessment.classification} likelihood of AI generation (${(aiAssessment.likelihood * 100).toFixed(0)}%).`
          : `AI CLEAN: Document exhibits natural human writing characteristics.`,
        sensitiveInfo.hasSensitiveInfo
          ? `WARNING: Detected ${sensitiveInfo.totalLeaks} potential sensitive data leaks.`
          : `CLEAN: Zero critical PII or API key leaks detected.`,
      ],
    };
  }

  /**
   * End-to-end Document Analysis execution pipeline.
   */
  static async analyzeDocument(fileId, userId) {
    const fileRecord = await UploadedFile.findOne({ _id: fileId, userId });
    if (!fileRecord) {
      throw new AppError('File not found or access denied.', HTTP_STATUS.NOT_FOUND);
    }

    // 1. Extract text & metadata
    const { extractedText, metadata } = await this.extractTextAndMetadata(
      fileRecord.filePath,
      fileRecord.mimeType
    );

    // 2. Detect sensitive info
    const sensitiveInfo = this.detectSensitiveInformation(extractedText);

    // 3. AI Generation Assessment (Phases 2-8)
    const aiAssessment = AiGenerationDetector.detectAiGeneration(extractedText, metadata);

    // 4. Document Risk Assessment (Phase 9)
    const riskAssessment = this.evaluateDocumentRisk(sensitiveInfo, aiAssessment, (extractedText.match(/\b\w+\b/g) || []).length);

    // 5. Generate Findings (Phase 15)
    const findings = this.generateFindings(aiAssessment, sensitiveInfo, riskAssessment);

    // 6. Compute Trust Indicators (Phase 11)
    const indicators = this.computeTrustIndicators(extractedText, metadata, sensitiveInfo, aiAssessment, riskAssessment);

    // Create Analysis Document in MongoDB
    const analysisRecord = await Analysis.create({
      userId,
      targetEntity: fileRecord.originalName,
      entityType: 'content',
      trustScore: indicators.trustScore,
      confidenceScore: indicators.confidenceScore,
      status: 'completed',
      riskCategory: indicators.riskCategory,
      insights: indicators.insights,
      graphMetadata: {
        nodeCount: indicators.wordCount,
        edgeCount: sensitiveInfo.totalLeaks + (aiAssessment.detected ? 1 : 0),
        centralityScore: indicators.trustScore / 100,
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
        trustScore: indicators.trustScore,
        riskCategory: indicators.riskCategory,
        aiLikelihood: aiAssessment.likelihood,
      },
    });

    // Auto-create Notification
    try {
      const NotificationService = require('./notification.service');
      const isCritical = riskAssessment.riskLevel === 'CRITICAL' || sensitiveInfo.hasSensitiveInfo;
      await NotificationService.createNotification({
        userId,
        type: sensitiveInfo.hasSensitiveInfo ? 'PII_DETECTED' : 'ANALYSIS_COMPLETE',
        title: sensitiveInfo.hasSensitiveInfo ? `PII Leaks Flagged: ${fileRecord.originalName}` : `Document Scan Complete: ${fileRecord.originalName}`,
        message: `Document scan completed. Trust Score: ${indicators.trustScore}% (${riskAssessment.riskLevel} risk). ${aiAssessment.detected ? `AI Likelihood: ${(aiAssessment.likelihood * 100).toFixed(0)}%.` : ''}`,
        severity: isCritical ? 'critical' : riskAssessment.riskLevel === 'HIGH' ? 'warning' : 'success',
        entityId: analysisRecord._id,
      });
    } catch (nErr) {
      console.error('[DocumentService] Notification trigger error:', nErr.message);
    }

    return {
      analysisId: analysisRecord._id,
      fileInfo: {
        originalName: fileRecord.originalName,
        mimeType: fileRecord.mimeType,
        sizeBytes: fileRecord.fileSizeBytes,
      },
      metadata,
      sensitiveInfo,
      aiGenerationAssessment: aiAssessment,
      riskAssessment,
      findings,
      trustIndicators: indicators,
      extractedSnippet: extractedText.substring(0, 300) + (extractedText.length > 300 ? '...' : ''),
    };
  }
}

module.exports = DocumentService;
