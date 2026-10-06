/**
 * Unit tests for InstagramOAuthService
 *
 * Tests are designed to run without DB/network access.
 * Live API calls and DB writes are mocked or skipped via getDbState() guards.
 */

const crypto = require('crypto');

// ── Mock DB state to disconnected so DB-guarded methods throw cleanly ─
jest.mock('../../src/config/db', () => ({
  getDbState: jest.fn().mockReturnValue(0),
}));

// ── Mock InstagramConnection model ────────────────────────────────────
jest.mock('../../src/models/InstagramConnection', () => {
  const findOneMock = jest.fn();
  const deleteOneMock = jest.fn().mockResolvedValue({});
  const updateOneMock = jest.fn().mockResolvedValue({});
  return {
    findOne: findOneMock,
    deleteOne: deleteOneMock,
    updateOne: updateOneMock,
    __findOneMock: findOneMock,
  };
});

const InstagramOAuthService = require('../../src/services/instagramOAuth.service');

// ─────────────────────────────────────────────────────────────────────
describe('InstagramOAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. Config status ───────────────────────────────────────────────
  describe('getConfigStatus()', () => {
    it('reports not configured when env vars are absent', () => {
      delete process.env.INSTAGRAM_APP_ID;
      delete process.env.INSTAGRAM_APP_SECRET;
      delete process.env.INSTAGRAM_REDIRECT_URI;

      const status = InstagramOAuthService.getConfigStatus();

      expect(status.configured).toBe(false);
      expect(status.appIdSet).toBe(false);
      expect(status.appSecretSet).toBe(false);
      expect(status.redirectUriSet).toBe(false);
    });

    it('reports configured when all env vars are present', () => {
      process.env.INSTAGRAM_APP_ID = 'test_app_id';
      process.env.INSTAGRAM_APP_SECRET = 'test_app_secret';
      process.env.INSTAGRAM_REDIRECT_URI = 'http://localhost:5000/api/v1/instagram/oauth/callback';

      const status = InstagramOAuthService.getConfigStatus();

      expect(status.configured).toBe(true);
      expect(status.appIdSet).toBe(true);
      expect(status.appSecretSet).toBe(true);
      expect(status.redirectUriSet).toBe(true);
      expect(Array.isArray(status.requiredScopes)).toBe(true);
      expect(status.requiredScopes.length).toBeGreaterThan(0);
    });
  });

  // ── 2. Auth URL generation ─────────────────────────────────────────
  describe('generateAuthUrl()', () => {
    beforeEach(() => {
      process.env.INSTAGRAM_APP_ID = 'test_app_id';
      process.env.INSTAGRAM_APP_SECRET = 'test_app_secret';
      process.env.INSTAGRAM_REDIRECT_URI = 'http://localhost:5000/api/v1/instagram/oauth/callback';
    });

    it('returns a valid Instagram auth URL with state', () => {
      const userId = 'user123abc';
      const { url, state } = InstagramOAuthService.generateAuthUrl(userId);

      expect(url).toContain('instagram.com/oauth/authorize');
      expect(url).toContain('client_id=test_app_id');
      expect(url).toContain('response_type=code');
      expect(url).toContain('instagram_business_basic');
      expect(typeof state).toBe('string');
      expect(state.length).toBeGreaterThan(10);
    });

    it('throws when app credentials are not configured', () => {
      delete process.env.INSTAGRAM_APP_ID;
      expect(() => InstagramOAuthService.generateAuthUrl('user1')).toThrow(
        /not configured/i
      );
    });

    it('state includes the userId at the end', () => {
      const userId = 'abc123xyz';
      const { state } = InstagramOAuthService.generateAuthUrl(userId);
      const parts = state.split('_');
      expect(parts[parts.length - 1]).toBe(userId);
    });
  });

  // ── 3. CSRF state validation ───────────────────────────────────────
  describe('validateOAuthState()', () => {
    it('returns true for matching state and userId when in stored state', () => {
      const userId = 'user999';
      const state = crypto.randomBytes(24).toString('hex') + '_' + userId;
      expect(InstagramOAuthService.validateOAuthState(state, state, userId)).toBe(true);
    });

    it('returns true using structural fallback when storedState is null but state signature is valid', () => {
      const userId = '654321654321654321654321';
      const state = crypto.randomBytes(24).toString('hex') + '_' + userId;
      expect(InstagramOAuthService.validateOAuthState(state, null, userId)).toBe(true);
    });

    it('returns false when storedState is null and state format is invalid', () => {
      const userId = 'user123';
      const invalidState = 'short_invalid_' + userId;
      expect(InstagramOAuthService.validateOAuthState(invalidState, null, userId)).toBe(false);
    });

    it('returns false for mismatched states when storedState exists', () => {
      const state = crypto.randomBytes(24).toString('hex') + '_user1';
      const other = crypto.randomBytes(24).toString('hex') + '_user1';
      expect(InstagramOAuthService.validateOAuthState(state, other, 'user1')).toBe(false);
    });

    it('returns false when userId does not match state suffix', () => {
      const state = crypto.randomBytes(24).toString('hex') + '_user1';
      expect(InstagramOAuthService.validateOAuthState(state, state, 'user2')).toBe(false);
    });

    it('returns false when state is null', () => {
      expect(InstagramOAuthService.validateOAuthState(null, null, 'user1')).toBe(false);
    });
  });

  // ── 4. extractLinks helper ────────────────────────────────────────
  describe('_extractLinks()', () => {
    it('extracts http and https links from caption text', () => {
      const caption =
        'Check out https://example.com and http://another.org for details. Also visit https://third.io';
      const links = InstagramOAuthService._extractLinks(caption);
      expect(links).toHaveLength(3);
      expect(links).toContain('https://example.com');
      expect(links).toContain('http://another.org');
    });

    it('deduplicates repeated links', () => {
      const caption = 'Visit https://example.com and also https://example.com again!';
      const links = InstagramOAuthService._extractLinks(caption);
      expect(links).toHaveLength(1);
    });

    it('returns empty array for empty caption', () => {
      expect(InstagramOAuthService._extractLinks('')).toEqual([]);
      expect(InstagramOAuthService._extractLinks(null)).toEqual([]);
    });
  });

  // ── 5. DB-gated methods throw when DB disconnected ────────────────
  describe('DB-gated methods (DB disconnected)', () => {
    it('getUserMedia() throws when DB is not connected', async () => {
      await expect(InstagramOAuthService.getUserMedia('user123')).rejects.toThrow(
        /Database not connected/i
      );
    });

    it('disconnect() throws when DB is not connected', async () => {
      await expect(InstagramOAuthService.disconnect('user123')).rejects.toThrow(
        /Database not connected/i
      );
    });

    it('saveConnection() throws when DB is not connected', async () => {
      await expect(
        InstagramOAuthService.saveConnection('user123', { accessToken: 'tok', expiresIn: 3600, instagramUserId: '123' })
      ).rejects.toThrow(/Database not connected/i);
    });
  });

  // ── 6. getConnectionStatus returns not-connected when DB is off ───
  describe('getConnectionStatus()', () => {
    it('returns connected: false with reason when DB is disconnected', async () => {
      const status = await InstagramOAuthService.getConnectionStatus('user1');
      expect(status.connected).toBe(false);
      expect(status.reason).toMatch(/database/i);
    });
  });
});
