const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Analysis = require('../models/Analysis');
const UploadedFile = require('../models/UploadedFile');
const History = require('../models/History');
const AppError = require('../utils/appError');
const { HTTP_STATUS } = require('../constants');

/**
 * Service Layer for Document Analysis, Text Extraction, PII Detection, and Trust Scoring
 */
class DocumentService {
  /**
   * Extracts text and technical metadata from PDF or DOCX file.
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
        pageCount: Math.ceil((extractedText.length || 1) / 3000), // Estimate pages based on char count
        fileFormat: 'DOCX',
        warnings: result.messages || [],
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
   * Calculates document metrics, trust indicators, and risk categorization.
   */
  static computeTrustIndicators(text, metadata, sensitiveInfo) {
    const words = text ? text.split(/\s+/).filter(Boolean) : [];
    const wordCount = words.length;
    const charCount = text.length;
    const estimatedReadingTimeMinutes = Math.ceil(wordCount / 200);

    // Initial Trust Score Baseline
    let trustScore = 95.0;

    // Deductions based on PII / Sensitive Information leaks
    if (sensitiveInfo.details.apiKeyCount > 0) trustScore -= 25 * sensitiveInfo.details.apiKeyCount;
    if (sensitiveInfo.details.ssnCount > 0) trustScore -= 20 * sensitiveInfo.details.ssnCount;
    if (sensitiveInfo.details.creditCardCount > 0) trustScore -= 15 * sensitiveInfo.details.creditCardCount;
    if (sensitiveInfo.details.suspiciousUrlCount > 0) trustScore -= 15 * sensitiveInfo.details.suspiciousUrlCount;
    if (sensitiveInfo.details.emailCount > 5) trustScore -= 10;

    // Low word count penalty
    if (wordCount < 10) trustScore -= 20;

    // Clamp Trust Score between 0 and 100
    trustScore = Math.max(0.0, Math.min(100.0, trustScore));

    // Determine Risk Category
    let riskCategory = 'low';
    if (trustScore < 40) riskCategory = 'critical';
    else if (trustScore < 65) riskCategory = 'high';
    else if (trustScore < 85) riskCategory = 'medium';

    return {
      trustScore,
      riskCategory,
      confidenceScore: 0.96,
      wordCount,
      charCount,
      estimatedReadingTimeMinutes,
      insights: [
        `Document contains ${wordCount} words across ${metadata.pageCount || 1} page(s).`,
        sensitiveInfo.hasSensitiveInfo
          ? `WARNING: Detected ${sensitiveInfo.totalLeaks} potential sensitive data leaks.`
          : `CLEAN: No critical PII or API key leaks detected.`,
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

    // Extract text & metadata
    const { extractedText, metadata } = await this.extractTextAndMetadata(
      fileRecord.filePath,
      fileRecord.mimeType
    );

    // Detect sensitive info
    const sensitiveInfo = this.detectSensitiveInformation(extractedText);

    // Compute trust indicators
    const indicators = this.computeTrustIndicators(extractedText, metadata, sensitiveInfo);

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
        edgeCount: sensitiveInfo.totalLeaks,
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
      },
    });

    return {
      analysisId: analysisRecord._id,
      fileInfo: {
        originalName: fileRecord.originalName,
        mimeType: fileRecord.mimeType,
        sizeBytes: fileRecord.fileSizeBytes,
      },
      metadata,
      sensitiveInfo,
      trustIndicators: indicators,
      extractedSnippet: extractedText.substring(0, 300) + (extractedText.length > 300 ? '...' : ''),
    };
  }
}

module.exports = DocumentService;
