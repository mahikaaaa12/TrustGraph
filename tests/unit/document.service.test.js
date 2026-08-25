const path = require('path');
const fs = require('fs');
const DocumentService = require('../../src/services/document.service');
const AiGenerationDetector = require('../../src/services/aiGenerationDetector');

describe('DocumentService & AiGenerationDetector Unit Tests', () => {
  describe('extractTextAndMetadata()', () => {
    const tempTxtPath = path.join(__dirname, 'temp_test_doc.txt');

    beforeAll(() => {
      fs.writeFileSync(
        tempTxtPath,
        'This document is created using ChatGPT for AI security testing. Contact support@company.com with sk_live_abc12345678901234567890.'
      );
    });

    afterAll(() => {
      if (fs.existsSync(tempTxtPath)) {
        fs.unlinkSync(tempTxtPath);
      }
    });

    it('should extract text content and calculate page count for TXT document', async () => {
      const result = await DocumentService.extractTextAndMetadata(tempTxtPath, 'text/plain');
      expect(result.extractedText).toContain('This document is created using ChatGPT');
      expect(result.metadata.fileFormat).toBe('TXT');
    });

    it('should detect TXT extension fallback even if mimeType is application/octet-stream', async () => {
      const result = await DocumentService.extractTextAndMetadata(tempTxtPath, 'application/octet-stream');
      expect(result.extractedText).toContain('ChatGPT');
    });
  });

  describe('detectSensitiveInformation()', () => {
    it('should detect API keys, emails, and SSNs in document text', () => {
      const text = 'User john@company.com with SSN 000-12-3456 exposed API key sk_live_abcdef1234567890123456.';
      const result = DocumentService.detectSensitiveInformation(text);

      expect(result.hasSensitiveInfo).toBe(true);
      expect(result.details.emailCount).toBe(1);
      expect(result.details.ssnCount).toBe(1);
      expect(result.details.apiKeyCount).toBe(1);
    });

    it('should return clean status for text without PII', () => {
      const text = 'Clean security policy document without sensitive credentials.';
      const result = DocumentService.detectSensitiveInformation(text);

      expect(result.hasSensitiveInfo).toBe(false);
      expect(result.totalLeaks).toBe(0);
    });
  });

  describe('detectAiGeneration()', () => {
    it('should detect explicit AI self-disclosure in document text', () => {
      const text = 'This document is created using ChatGPT for AI testing purposes.';
      const result = AiGenerationDetector.detectAiGeneration(text, {});

      expect(result.detected).toBe(true);
      expect(result.likelihood).toBeGreaterThanOrEqual(0.85);
      expect(result.classification).toBe('VERY_HIGH');
      expect(result.explanation).toContain('AI');
    });

    it('should NOT classify general AI discussion as AI-generated text', () => {
      const text = 'Artificial Intelligence is transforming business operations and technology adoption across global enterprise markets.';
      const result = AiGenerationDetector.detectAiGeneration(text, {});

      expect(result.detected).toBe(false);
      expect(result.likelihood).toBeLessThan(0.35);
      expect(result.classification).toBe('LOW');
    });
  });

  describe('evaluateDocumentRisk()', () => {
    it('should evaluate CRITICAL risk level for API key leaks', () => {
      const sensitiveInfo = {
        hasSensitiveInfo: true,
        details: { apiKeyCount: 2, ssnCount: 0, creditCardCount: 0, suspiciousUrlCount: 0 },
      };
      const aiAssessment = { detected: false };

      const result = DocumentService.evaluateDocumentRisk(sensitiveInfo, aiAssessment, 100);
      expect(result.riskLevel).toBe('CRITICAL');
      expect(result.reasons.some((r) => r.includes('API secret key'))).toBe(true);
    });
  });
});
