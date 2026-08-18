const ImageService = require('../../src/services/image.service');

describe('ImageService Unit Tests', () => {
  describe('evaluateProvenance()', () => {
    it('should classify missing EXIF as LIMITED/UNVERIFIED provenance without declaring it malicious', () => {
      const result = ImageService.evaluateProvenance({ hasExifData: false });

      expect(result.status).toBe('UNVERIFIED');
      expect(result.signals).toContain('EXIF metadata unavailable or stripped.');
    });

    it('should classify full camera sensor metadata as VERIFIED provenance', () => {
      const result = ImageService.evaluateProvenance({
        hasExifData: true,
        make: 'Canon',
        model: 'EOS R5',
        dateTimeOriginal: new Date().toISOString(),
      });

      expect(result.status).toBe('VERIFIED');
    });
  });

  describe('detectAiGeneratedImage()', () => {
    it('should detect AI generation for explicit software tags and standard tensor dimensions', () => {
      const result = ImageService.detectAiGeneratedImage(
        { software: 'Midjourney v6.0', make: null, model: null },
        { width: 1024, height: 1024 }
      );

      expect(result.detected).toBe(true);
      expect(result.likelihood).toBeGreaterThanOrEqual(0.80);
      expect(result.classification).toBe('VERY_HIGH');
    });
  });

  describe('evaluateImageSecurityRisk()', () => {
    it('should NOT classify an AI-generated or edited image as CRITICAL security risk if zero payloads exist', () => {
      const fileBuffer = Buffer.from('standard image binary stream without script tags');
      const aiAssessment = { detected: true };
      const manipAssessment = { detected: true };

      const result = ImageService.evaluateImageSecurityRisk(fileBuffer, {}, {}, aiAssessment, manipAssessment);

      expect(result.riskLevel).toBe('LOW');
      expect(result.reasons.some((r) => r.includes('digital manipulation or AI generation'))).toBe(true);
    });

    it('should flag CRITICAL security risk if executable script tags are embedded in image buffer', () => {
      const fileBuffer = Buffer.from('JPEG data with <script>alert("hack")</script>');
      const result = ImageService.evaluateImageSecurityRisk(fileBuffer, {}, {}, {}, {});

      expect(result.riskLevel).toBe('CRITICAL');
      expect(result.reasons.some((r) => r.includes('CRITICAL'))).toBe(true);
    });
  });
});
