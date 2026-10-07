const CreatorService = require('../../src/services/creator.service');
const InstagramService = require('../../src/services/instagram.service');
const WebsiteService = require('../../src/services/website.service');
const ImageService = require('../../src/services/image.service');

describe('InstagramService & CreatorService Unit Tests', () => {
  beforeEach(() => {
    jest.spyOn(WebsiteService, 'analyzeWebsite').mockImplementation(async () => {
      return {
        trustScore: 88,
        sslCertificate: { hasSsl: true, isAuthorized: true },
        phishingRisk: { classification: 'LOW', isPhishing: false },
        domainAnalysis: { hasMxRecords: true, heuristicSecurityStatus: 'HEALTHY' },
      };
    });
    jest.spyOn(CreatorService, 'fetchImageSafely').mockResolvedValue('mock_file_id_123');
    jest.spyOn(ImageService, 'analyzeImage').mockResolvedValue({
      overallTrustScore: 88,
      trustScore: 88,
      confidenceScore: 0.85,
      aiGenerationAssessment: { detected: false, likelihood: 0.1, classification: 'UNLIKELY', signals: [] },
      manipulationAssessment: { detected: false, likelihood: 0.0, classification: 'UNLIKELY', signals: [] },
      provenanceAssessment: { status: 'VERIFIED', signals: [] },
      exifData: { hasExifData: true },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('InstagramService', () => {
    test('should parse Instagram post and profile URLs', () => {
      const parsedPost = InstagramService.parseInstagramUrl('https://www.instagram.com/p/C9xL8mOP2kL/');
      expect(parsedPost).not.toBeNull();
      expect(parsedPost.type).toBe('post');
      expect(parsedPost.shortcode).toBe('C9xL8mOP2kL');

      const parsedReel = InstagramService.parseInstagramUrl('https://instagram.com/reel/D1a2b3c4d5/');
      expect(parsedReel).not.toBeNull();
      expect(parsedReel.type).toBe('post');
      expect(parsedReel.postType).toBe('reel');

      const parsedProfile = InstagramService.parseInstagramUrl('@tech_creator');
      expect(parsedProfile.type).toBe('profile');
      expect(parsedProfile.handle).toBe('tech_creator');
    });

    test('should resolve post details gracefully', async () => {
      const result = await InstagramService.resolvePostDetails('https://www.instagram.com/p/C9xL8mOP2kL/');
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('caption');
      expect(result.data).toHaveProperty('imageUrl');
      expect(result.data).toHaveProperty('externalLink');
      expect(result.data.author.username).toBe('creator_studio_official');
    });
  });

  describe('CreatorService', () => {
    test('should translate technical security terminology into creator-friendly phrases', () => {
      const ssrfMsg = CreatorService.translateTechnicalToCreatorLanguage('SSRF vulnerability detected on loopback target');
      expect(ssrfMsg).toBe('External link could expose users to an unsafe destination.');

      const aiMsg = CreatorService.translateTechnicalToCreatorLanguage('AI generation likelihood: 85% synthetic text');
      expect(aiMsg).toBe('Strong AI-generated writing signals detected in caption.');

      const genericMsg = CreatorService.translateTechnicalToCreatorLanguage('Normal clean text');
      expect(genericMsg).toBe('Normal clean text');
    });

    test('should analyze a full content package and return unified creator trust scores', async () => {
      const mockPayload = {
        mode: 'package',
        caption: 'Excited to announce our new eco-friendly merch! Check out link in bio: https://example.com/shop',
        websiteUrl: 'https://example.com/shop',
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
      };

      const result = await CreatorService.analyzeCreatorPackage(mockPayload, '60b8d6f8f1a2c3456789abcd');

      expect(result).toHaveProperty('contentTrustScore');
      expect(typeof result.contentTrustScore).toBe('number');
      expect(result.contentTrustScore).toBeGreaterThanOrEqual(0);
      expect(result.contentTrustScore).toBeLessThanOrEqual(100);

      expect(result).toHaveProperty('authenticity');
      expect(result).toHaveProperty('security');
      expect(result).toHaveProperty('aiGenerationSignal');
      expect(result).toHaveProperty('linkSafety');
      expect(result).toHaveProperty('contentRisksCount');

      expect(result.sections).toHaveProperty('authenticity');
      expect(result.sections).toHaveProperty('security');
      expect(result.sections).toHaveProperty('aiContentSignals');
      expect(result.sections).toHaveProperty('imageForensics');
      expect(result.sections).toHaveProperty('textAnalysis');
      expect(result.sections).toHaveProperty('linkSafety');
      expect(result.sections).toHaveProperty('recommendations');
    });

    test('should handle Instagram post link in Creator Workspace package pipeline', async () => {
      const mockPayload = {
        mode: 'social_post',
        instagramUrl: 'https://www.instagram.com/p/C9xL8mOP2kL/',
      };

      const result = await CreatorService.analyzeCreatorPackage(mockPayload, '60b8d6f8f1a2c3456789abcd');
      expect(result.instagramData).not.toBeNull();
      expect(result.instagramData.shortcode).toBe('C9xL8mOP2kL');
      expect(result.sections.textAnalysis.summary).toContain('Caption contains');
    });

    test('should execute Post Verification pipeline with image, caption, and link', async () => {
      const mockPayload = {
        mode: 'post_verification',
        caption: 'Exclusive release! Check our official site for details: https://mybrand.com/official',
        websiteUrl: 'https://mybrand.com/official',
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
      };

      const result = await CreatorService.analyzeCreatorPackage(mockPayload, '60b8d6f8f1a2c3456789abcd');
      expect(result.mode).toBe('post_verification');
      expect(result.contentTrustScore).toBeGreaterThanOrEqual(0);
      expect(result.authenticity).toBeDefined();
      expect(result.security).toBeDefined();
      expect(result.linkSafety).toBe('Safe');
      expect(Array.isArray(result.sections.recommendations.items)).toBe(true);
    });

    test('should evaluate Brand Collaboration request and return checks, red flags, and non-definitive recommendation', async () => {
      const mockPayload = {
        brandWebsiteUrl: 'https://brand-official.com',
        collaborationText: 'We would love to sponsor your next video! Please send your wire transfer info or login to verify your account immediately.',
      };

      const result = await CreatorService.analyzeBrandCollaboration(mockPayload, '60b8d6f8f1a2c3456789abcd');
      expect(result).toHaveProperty('collaborationTrustScore');
      expect(result).toHaveProperty('verdict');
      expect(Array.isArray(result.checks)).toBe(true);
      expect(Array.isArray(result.redFlags)).toBe(true);
      expect(result.recommendation).toContain('Verify the brand through its official website');
      expect(result.recommendation).not.toContain('definitely a scam');
    });
  });
});
