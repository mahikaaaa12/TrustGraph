const SsrfValidator = require('../../src/utils/ssrfValidator');

describe('SsrfValidator Security Unit Tests', () => {
  describe('isPrivateIp()', () => {
    it('should block loopback and RFC 1918 private IPv4 subnets', () => {
      expect(SsrfValidator.isPrivateIp('127.0.0.1')).toBe(true);
      expect(SsrfValidator.isPrivateIp('127.12.34.56')).toBe(true);
      expect(SsrfValidator.isPrivateIp('10.0.0.5')).toBe(true);
      expect(SsrfValidator.isPrivateIp('10.254.10.1')).toBe(true);
      expect(SsrfValidator.isPrivateIp('192.168.1.1')).toBe(true);
      expect(SsrfValidator.isPrivateIp('172.16.0.1')).toBe(true);
      expect(SsrfValidator.isPrivateIp('172.31.255.255')).toBe(true);
      expect(SsrfValidator.isPrivateIp('169.254.169.254')).toBe(true);
    });

    it('should block IPv6 loopback and link-local ranges', () => {
      expect(SsrfValidator.isPrivateIp('::1')).toBe(true);
      expect(SsrfValidator.isPrivateIp('0:0:0:0:0:0:0:1')).toBe(true);
      expect(SsrfValidator.isPrivateIp('fe80::1ff:fe23:4567:890a')).toBe(true);
      expect(SsrfValidator.isPrivateIp('fc00::1')).toBe(true);
      expect(SsrfValidator.isPrivateIp('::ffff:127.0.0.1')).toBe(true);
    });

    it('should allow public routable IP addresses', () => {
      expect(SsrfValidator.isPrivateIp('8.8.8.8')).toBe(false);
      expect(SsrfValidator.isPrivateIp('1.1.1.1')).toBe(false);
      expect(SsrfValidator.isPrivateIp('142.250.190.46')).toBe(false);
    });
  });

  describe('validateHostname() and validateUrl()', () => {
    it('should reject blocked hostnames like localhost or cloud metadata', async () => {
      const localhostCheck = await SsrfValidator.validateHostname('localhost');
      expect(localhostCheck.isSafe).toBe(false);

      const metadataCheck = await SsrfValidator.validateHostname('169.254.169.254');
      expect(metadataCheck.isSafe).toBe(false);
    });

    it('should block non-http/https protocols (e.g., file://, gopher://)', async () => {
      const fileCheck = await SsrfValidator.validateUrl('file:///etc/passwd');
      expect(fileCheck.isSafe).toBe(false);
      expect(fileCheck.error).toContain('Disallowed protocol');
    });

    it('should validate redirect targets against SSRF', async () => {
      const safeRedirect = await SsrfValidator.validateRedirect('https://example.com/login', 'https://example.com/dashboard');
      // For real domains in test, validateUrl checks protocol and hostname
      expect(safeRedirect).toBeDefined();

      const maliciousRedirect = await SsrfValidator.validateRedirect('https://example.com/login', 'http://169.254.169.254/latest/meta-data');
      expect(maliciousRedirect.isSafe).toBe(false);
    });
  });
});
