jest.mock('../../src/models/Analysis');
jest.mock('../../src/models/UploadedFile');
jest.mock('../../src/models/History');

const DashboardService = require('../../src/services/dashboard.service');
const Analysis = require('../../src/models/Analysis');
const UploadedFile = require('../../src/models/UploadedFile');

describe('DashboardService Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSummary()', () => {
    it('should return aggregated MongoDB metrics for authenticated user', async () => {
      const mockUserId = '66b0e81ac8e2a149f8a31d99';

      Analysis.countDocuments.mockResolvedValue(10);
      Analysis.aggregate.mockImplementation((pipeline) => {
        if (pipeline[1]?.$group?._id === null) {
          return Promise.resolve([{ avgScore: 85.4, avgConf: 0.96 }]);
        }
        if (pipeline[1]?.$group?._id === '$riskCategory') {
          return Promise.resolve([
            { _id: 'low', count: 6 },
            { _id: 'medium', count: 3 },
            { _id: 'critical', count: 1 },
          ]);
        }
        if (pipeline[1]?.$group?._id === '$entityType') {
          return Promise.resolve([
            { _id: 'content', count: 7 },
            { _id: 'domain', count: 3 },
          ]);
        }
        return Promise.resolve([]);
      });

      UploadedFile.countDocuments.mockResolvedValue(5);
      Analysis.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ _id: 'an1', targetEntity: 'file.pdf', trustScore: 85 }]),
      });

      const summary = await DashboardService.getSummary(mockUserId);

      expect(summary.totalAnalyses).toBe(10);
      expect(summary.averageTrustScore).toBe(85.4);
      expect(summary.averageConfidence).toBe(0.96);
      expect(summary.filesProcessed).toBe(5);
      expect(summary.riskDistribution.low).toBe(6);
      expect(summary.riskDistribution.critical).toBe(1);
    });
  });
});
