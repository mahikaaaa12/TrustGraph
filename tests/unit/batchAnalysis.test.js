const CreatorService = require('../../src/services/creator.service');
const WebsiteService = require('../../src/services/website.service');
const upload = require('../../src/middlewares/upload.middleware');
const { batchUpload } = require('../../src/middlewares/upload.middleware');

describe('Batch Content Analysis Unit Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // 1. Batch Success
  test('batch success: processes multiple valid items cleanly', async () => {
    jest.spyOn(WebsiteService, 'analyzeWebsite').mockResolvedValue({
      trustScore: 90,
      sslCertificate: { hasSsl: true },
      phishingRisk: { classification: 'LOW', isPhishing: false },
    });

    const items = [
      { identifier: 'post_01', type: 'Text', caption: 'Clean product update caption!' },
      { identifier: 'post_02', type: 'URL', url: 'https://official-brand.com' },
      { identifier: 'post_03', type: 'Image', imageUrl: 'https://images.unsplash.com/photo-1' },
    ];

    const result = await CreatorService.analyzeBatch(items, '60b8d6f8f1a2c3456789abcd');

    expect(result).toHaveProperty('summary');
    expect(result.summary.totalAnalyzed).toBe(3);
    expect(result.summary.successfulCount).toBe(3);
    expect(result.summary.failedCount).toBe(0);
    expect(result.results).toHaveLength(3);

    expect(result.results[0].status).toBe('Complete');
    expect(result.results[0].identifier).toBe('post_01');
    expect(result.results[1].status).toBe('Complete');
    expect(result.results[2].status).toBe('Complete');
  });

  // 2. Partial Failure
  test('partial failure: handles single broken item gracefully without failing entire batch', async () => {
    jest.spyOn(WebsiteService, 'analyzeWebsite').mockImplementation(async (targetUrl) => {
      if (targetUrl.includes('broken')) {
        throw new Error('Connection reset by peer');
      }
      return { trustScore: 85 };
    });

    const items = [
      { identifier: 'post_01', type: 'Text', caption: 'Healthy text post' },
      { identifier: 'post_02', type: 'URL', url: 'https://broken-server.xyz/error' },
      { identifier: 'post_03', type: 'URL', url: 'https://working-site.org' },
    ];

    const result = await CreatorService.analyzeBatch(items, '60b8d6f8f1a2c3456789abcd');

    expect(result.summary.totalAnalyzed).toBe(3);
    expect(result.summary.successfulCount).toBe(2);
    expect(result.summary.failedCount).toBe(1);

    // Broken item checks
    const failedItem = result.results.find((r) => r.identifier === 'post_02');
    expect(failedItem).toBeDefined();
    expect(failedItem.status).toBe('Failed');
    expect(failedItem.trustScore).toBeNull(); // Do NOT fabricate score for failed analysis
    expect(failedItem.risk).toBe('High');
    expect(failedItem.error).toContain('Connection reset');

    // Healthy items checks
    const healthyItem = result.results.find((r) => r.identifier === 'post_01');
    expect(healthyItem.status).toBe('Complete');
  });

  // 3. Invalid File Extension Filter
  test('invalid file: upload middleware blocks dangerous executable files', (done) => {
    const mockFile = {
      originalname: 'malicious_script.exe',
      mimetype: 'application/octet-stream',
    };

    const req = {};
    const fileFilter = upload.fileFilter || batchUpload.fileFilter;

    fileFilter(req, mockFile, (err, allowed) => {
      expect(err).toBeDefined();
      expect(err.message).toContain('Executable or dangerous script extension detected');
      expect(allowed).toBe(false);
      done();
    });
  });

  // 4. Oversized File Limit Configuration
  test('oversized file: upload limit config is set to 10MB per file', () => {
    const limits = batchUpload.limits;
    expect(limits.fileSize).toBe(10 * 1024 * 1024); // 10 MB limit
    expect(limits.files).toBe(20); // Up to 20 files for batch
  });

  // 5. Duplicate Content Detection
  test('duplicate content: flags duplicate items within the batch', async () => {
    const items = [
      { identifier: 'post_01', type: 'Text', caption: 'Duplicate promo message here!' },
      { identifier: 'post_02', type: 'Text', caption: 'Duplicate promo message here!' },
    ];

    const result = await CreatorService.analyzeBatch(items, '60b8d6f8f1a2c3456789abcd');

    expect(result.summary.totalAnalyzed).toBe(2);
    expect(result.results[1].findings).toEqual(
      expect.arrayContaining([expect.stringContaining('Duplicate content detected')])
    );
  });
});
