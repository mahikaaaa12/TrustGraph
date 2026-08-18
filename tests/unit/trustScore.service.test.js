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
    });
  });
});
