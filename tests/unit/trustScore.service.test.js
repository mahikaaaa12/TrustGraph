jest.mock('../../src/models/Analysis');
jest.mock('../../src/models/History');
jest.mock('../../src/models/Notification');

const TrustScoreService = require('../../src/services/trustScore.service');
const Analysis = require('../../src/models/Analysis');
const History = require('../../src/models/History');

describe('TrustScoreService Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('evaluateTrustScore()', () => {
    it('should compute weighted composite score and dimension contributions', async () => {
      const mockUserId = '66b0e81ac8e2a149f8a31d99';
      const inputs = {
        imageScore: 80,
        documentScore: 90,
        websiteScore: 85,
        textScore: 95,
      };

      Analysis.create.mockResolvedValue({
        _id: 'an_mock_123',
        trustScore: 86.8,
        confidenceScore: 0.95,
        riskCategory: 'low',
      });
      History.create.mockResolvedValue(true);

      const result = await TrustScoreService.evaluateTrustScore(inputs, mockUserId);

      expect(result).toHaveProperty('overallTrustScore');
      expect(result).toHaveProperty('dimensions');
      expect(result.dimensions).toHaveProperty('authenticity');
      expect(result.dimensions.authenticity).toHaveProperty('contribution');
      expect(result.dataAvailability.providedChannels).toBe(4);
      expect(result.analyzedModalities).toEqual(['IMAGE', 'DOCUMENT', 'WEBSITE', 'TEXT']);
      expect(result.missingModalities).toEqual([]);
    });

    it('should renormalize weights over active modalities and not inject ghost scores', async () => {
      const mockUserId = '66b0e81ac8e2a149f8a31d99';
      const inputs = {
        imageScore: 90,
        textScore: 70,
      };

      Analysis.create.mockResolvedValue({ _id: 'an_mock_456' });
      History.create.mockResolvedValue(true);

      const result = await TrustScoreService.evaluateTrustScore(inputs, mockUserId);

      expect(result.analyzedModalities).toEqual(['IMAGE', 'TEXT']);
      expect(result.missingModalities).toEqual(['DOCUMENT', 'WEBSITE']);
      // Security dimension should be null/inactive because neither WEBSITE nor DOCUMENT was analyzed
      expect(result.breakdown.securityEncryption).toBeNull();
      expect(result.dimensions.security.active).toBe(false);
      // Normalized active weights sum to 1.0, composite score calculated purely from active inputs
      expect(result.overallTrustScore).toBeGreaterThanOrEqual(70);
      expect(result.overallTrustScore).toBeLessThanOrEqual(90);
    });

    it('should accurately reflect single modality score without phantom defaults', async () => {
      const mockUserId = '66b0e81ac8e2a149f8a31d99';
      const inputs = {
        imageScore: 30,
      };

      Analysis.create.mockResolvedValue({ _id: 'an_mock_789' });
      History.create.mockResolvedValue(true);

      const result = await TrustScoreService.evaluateTrustScore(inputs, mockUserId);

      expect(result.analyzedModalities).toEqual(['IMAGE']);
      expect(result.missingModalities).toEqual(['DOCUMENT', 'WEBSITE', 'TEXT']);
      // When only image is analyzed with 30, score must be 30, NOT pulled up by phantom 75/80 defaults!
      expect(result.overallTrustScore).toBe(30.0);
    });
  });
});
