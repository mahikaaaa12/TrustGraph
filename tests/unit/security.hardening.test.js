const SsrfValidator = require('../../src/utils/ssrfValidator');
const { sanitizeObject } = require('../../src/middlewares/sanitize.middleware');
const { verifyToken, generateToken } = require('../../src/utils/jwt');
const jwt = require('jsonwebtoken');

describe('Security Hardening & Vulnerability Unit Tests', () => {
  describe('1. SSRF Defense & Bounded Network Guards', () => {
    it('should block loopback and cloud metadata IPv4 addresses', () => {
      expect(SsrfValidator.isPrivateIp('127.0.0.1')).toBe(true);
      expect(SsrfValidator.isPrivateIp('169.254.169.254')).toBe(true);
      expect(SsrfValidator.isPrivateIp('0.0.0.0')).toBe(true);
    });

    it('should block RFC 1918 private intranet ranges', () => {
      expect(SsrfValidator.isPrivateIp('10.0.0.1')).toBe(true);
      expect(SsrfValidator.isPrivateIp('172.16.0.1')).toBe(true);
      expect(SsrfValidator.isPrivateIp('192.168.1.100')).toBe(true);
    });

    it('should block IPv6 loopback, link-local, and unique local addresses', () => {
      expect(SsrfValidator.isPrivateIp('::1')).toBe(true);
      expect(SsrfValidator.isPrivateIp('fe80::1')).toBe(true);
      expect(SsrfValidator.isPrivateIp('fc00::1')).toBe(true);
    });

    it('should allow public routable Internet IP addresses', () => {
      expect(SsrfValidator.isPrivateIp('8.8.8.8')).toBe(false);
      expect(SsrfValidator.isPrivateIp('1.1.1.1')).toBe(false);
      expect(SsrfValidator.isPrivateIp('142.250.190.46')).toBe(false);
    });

    it('should reject non-HTTP/HTTPS protocol schemes like file:// and gopher://', async () => {
      const fileRes = await SsrfValidator.validateUrl('file:///etc/passwd');
      expect(fileRes.isSafe).toBe(false);
      expect(fileRes.error).toContain('Disallowed protocol');

      const gopherRes = await SsrfValidator.validateUrl('gopher://127.0.0.1:70/');
      expect(gopherRes.isSafe).toBe(false);

      const ftpRes = await SsrfValidator.validateUrl('ftp://example.com/file');
      expect(ftpRes.isSafe).toBe(false);
    });

    it('should reject blocked local hostnames like localhost, internal, and metadata', async () => {
      const localRes = await SsrfValidator.validateHostname('localhost');
      expect(localRes.isSafe).toBe(false);

      const metaRes = await SsrfValidator.validateHostname('metadata.google.internal');
      expect(metaRes.isSafe).toBe(false);

      const awsRes = await SsrfValidator.validateHostname('169.254.169.254');
      expect(awsRes.isSafe).toBe(false);
    });
  });

  describe('2. NoSQL & MongoDB Query Injection Sanitization', () => {
    it('should recursively strip all operator keys starting with $ or containing .', () => {
      const maliciousPayload = {
        username: 'admin',
        password: { $gt: '' },
        filter: {
          $ne: null,
          role: 'user',
          'nested.field': 'injected',
        },
        tags: [{ $regex: '.*' }, 'safe_tag'],
      };

      const sanitized = sanitizeObject(maliciousPayload);

      expect(sanitized.username).toBe('admin');
      expect(sanitized.password).toEqual({});
      expect(sanitized.filter).toEqual({ role: 'user' });
      expect(sanitized.tags).toEqual([{}, 'safe_tag']);
      expect(sanitized).not.toHaveProperty('$gt');
      expect(sanitized.filter).not.toHaveProperty('nested.field');
    });
  });

  describe('3. JWT & Authentication Security', () => {
    it('should successfully sign and verify valid JWT tokens', () => {
      const token = generateToken({ id: 'user_123', role: 'admin' });
      const decoded = verifyToken(token);

      expect(decoded.id).toBe('user_123');
      expect(decoded.role).toBe('admin');
      expect(decoded).toHaveProperty('exp');
    });

    it('should reject tampered or forged JWT tokens', () => {
      const token = generateToken({ id: 'user_123', role: 'admin' });
      const tamperedToken = token.slice(0, -5) + 'AAAAA';

      expect(() => verifyToken(tamperedToken)).toThrow();
    });

    it('should reject expired tokens when verified', () => {
      const expiredToken = jwt.sign({ id: 'user_123' }, 'trustgraph_default_jwt_secret_key_change_in_production_32bytes', {
        expiresIn: '-10s',
      });

      expect(() => verifyToken(expiredToken)).toThrow(/jwt expired/);
    });
  });

  describe('4. Safe Logging & Credential Redaction', () => {
    it('should redact sensitive query parameters from log strings', () => {
      const rawUrl = '/api/v1/auth/login?password=SuperSecret123&apiKey=ak_live_998877&other=safe';
      const cleanUrl = rawUrl.replace(/(password|token|secret|key|authorization|jwt|apiKey)=[^&]+/gi, '$1=[REDACTED]');

      expect(cleanUrl).not.toContain('SuperSecret123');
      expect(cleanUrl).not.toContain('ak_live_998877');
      expect(cleanUrl).toContain('password=[REDACTED]');
      expect(cleanUrl).toContain('apiKey=[REDACTED]');
      expect(cleanUrl).toContain('other=safe');
    });
  });
});
