const ImageService = require('../../src/services/image.service');

describe('ImageService Forensic Audit & Pipeline Unit Tests', () => {
  describe('1. Known Authentic Photograph', () => {
    it('should classify photo with complete camera hardware EXIF as VERIFIED provenance and UNLIKELY AI likelihood', () => {
      const exifData = {
        hasExifData: true,
        make: 'Canon',
        model: 'EOS R5',
        iso: 100,
        focalLength: 50,
        dateTimeOriginal: new Date().toISOString(),
      };
      const sharpMeta = { width: 4032, height: 3024, format: 'jpeg' };
      const fileBuffer = Buffer.from('authentic camera raw buffer');

      const provenance = ImageService.evaluateProvenance(exifData);
      const aiResult = ImageService.detectAiGeneratedImage(exifData, sharpMeta, fileBuffer);

      expect(provenance.status).toBe('VERIFIED');
      expect(provenance.confidence).toBeGreaterThanOrEqual(0.90);
      expect(aiResult.detected).toBe(false);
      expect(aiResult.classification).toBe('UNLIKELY');
      expect(aiResult.likelihood).toBeLessThan(0.35);
    });
  });

  describe('2. Known AI-Generated Image', () => {
    it('should classify image with AI software tags and standard tensor dimensions as LIKELY_AI_GENERATED', () => {
      const exifData = { software: 'Midjourney v6.0', make: null, model: null };
      const sharpMeta = { width: 1024, height: 1024, format: 'png' };

      const aiResult = ImageService.detectAiGeneratedImage(exifData, sharpMeta);

      expect(aiResult.detected).toBe(true);
      expect(aiResult.classification).toBe('LIKELY_AI_GENERATED');
      expect(aiResult.likelihood).toBeGreaterThanOrEqual(0.75);
    });
  });

  describe('3. Manipulated Photograph', () => {
    it('should detect digital editing software signatures for Photoshop / Canva without conflating with AI generation', () => {
      const exifData = { software: 'Adobe Photoshop CC 2024', make: 'Nikon', model: 'D850' };
      const sharpMeta = { width: 1920, height: 1080, format: 'jpeg' };
      const elaResults = { calculated: true, highErrorThresholdExceeded: true, averageErrorLevel: 15.4 };

      const manipResult = ImageService.detectImageManipulation(exifData, sharpMeta, elaResults);
      const aiResult = ImageService.detectAiGeneratedImage(exifData, sharpMeta);

      expect(manipResult.detected).toBe(true);
      expect(manipResult.classification).toBe('HIGH');
      expect(manipResult.detectedSoftware).toBe('photoshop');
      // Manipulation does NOT force AI generation declaration
      expect(aiResult.detected).toBe(false);
    });
  });

  describe('4. Image with No EXIF', () => {
    it('should NOT treat missing EXIF as proof of AI generation, returning INCONCLUSIVE instead of false authenticity or false AI alert', () => {
      const exifData = { hasExifData: false };
      const sharpMeta = { width: 1200, height: 800, format: 'png' }; // Non-standard latent grid

      const provenance = ImageService.evaluateProvenance(exifData);
      const aiResult = ImageService.detectAiGeneratedImage(exifData, sharpMeta);

      expect(provenance.status).toBe('UNVERIFIED');
      expect(aiResult.detected).toBe(false);
      expect(aiResult.classification).toBe('INCONCLUSIVE');
      expect(aiResult.signals.some((s) => s.type === 'missing_hardware_tags')).toBe(false); // Check no artificial score inflation
    });
  });

  describe('5. Invalid Image / Graceful Error Handling', () => {
    it('should handle missing files and ELA calculation failures gracefully without returning fake mock statistics', async () => {
      const elaResult = await ImageService.performErrorLevelAnalysis('/non/existent/path.jpg', 'missing.jpg');

      expect(elaResult.calculated).toBe(false);
      expect(elaResult.averageErrorLevel).toBe(0);
      expect(elaResult.statistics.meanError).toBe(0);
      expect(elaResult).toHaveProperty('error');
      expect(elaResult.error).toContain('not found on disk');
    });
  });

  describe('6. Image with C2PA / AI Metadata', () => {
    it('should detect C2PA manifest markers in file buffer header and assign high confidence AI evidence', () => {
      const c2paBuffer = Buffer.from('PNG header ... urn:c2pa:openai chatgpt dalle3 c2pa.assertions ...');
      const aiResult = ImageService.detectAiGeneratedImage({}, { width: 1024, height: 1024 }, c2paBuffer);

      expect(aiResult.detected).toBe(true);
      expect(aiResult.likelihood).toBeGreaterThanOrEqual(0.95);
      expect(aiResult.confidence).toBe(0.99);
      expect(aiResult.signals.some((s) => s.type === 'ai_software_signature')).toBe(true);
    });
  });

  describe('7. Ambiguous Image', () => {
    it('should return INCONCLUSIVE classification when evidence is insufficient for both AI generation and camera hardware', () => {
      const exifData = { hasExifData: false };
      const sharpMeta = { width: 1366, height: 768, format: 'jpeg' };
      const fileBuffer = Buffer.from('ambiguous image data');

      const aiResult = ImageService.detectAiGeneratedImage(exifData, sharpMeta, fileBuffer);

      expect(aiResult.detected).toBe(false);
      expect(aiResult.classification).toBe('INCONCLUSIVE');
      expect(aiResult.likelihood).toBeLessThan(0.35);
    });
  });
});
