const WebsiteService = require('../../src/services/website.service');
const URL = require('url').URL;

describe('WebsiteService Unit Tests', () => {
  describe('evaluateTlsAssessment()', () => {
    it('should calculate valid TLS assessment for active certificates', () => {
      const sslInfo = {
        hasSsl: true,
        isAuthorized: true,
        isExpired: false,
        daysRemaining: 180,
        issuer: 'Let\'s Encrypt',
      };

      const result = WebsiteService.evaluateTlsAssessment(sslInfo);

      expect(result.valid).toBe(true);
      expect(result.score).toBe(95);
    });

    it('should return invalid TLS for missing SSL without automatically marking website as malicious', () => {
      const sslInfo = { hasSsl: false, error: 'No TLS' };
      const result = WebsiteService.evaluateTlsAssessment(sslInfo);

      expect(result.valid).toBe(false);
      expect(result.score).toBe(0);
    });
  });

  describe('analyzePhishingRisk()', () => {
    it('should NOT classify a URL as phishing solely because it contains the keyword "login"', () => {
      const urlObj = new URL('https://mycompany.com/login');
      const sslInfo = { hasSsl: true, isAuthorized: true, isExpired: false };
      const dnsInfo = { hasMxRecords: true };

      const result = WebsiteService.analyzePhishingRisk(urlObj, sslInfo, dnsInfo);

      expect(result.isLikelyPhishing).toBe(false);
      expect(result.likelihood).toBeLessThan(0.40);
    });

    it('should detect HIGH phishing likelihood when raw IP is combined with brand impersonation and authentication keywords', () => {
      const urlObj = new URL('http://192.168.1.100/paypal-verify/login');
      const sslInfo = { hasSsl: false };
      const dnsInfo = { hasMxRecords: false };

      const result = WebsiteService.analyzePhishingRisk(urlObj, sslInfo, dnsInfo);

      expect(result.isLikelyPhishing).toBe(true);
      expect(result.likelihood).toBeGreaterThanOrEqual(0.70);
    });
  });
});
