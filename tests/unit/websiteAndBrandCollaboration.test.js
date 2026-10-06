const WebsiteService = require('../../src/services/website.service');
const CreatorService = require('../../src/services/creator.service');

describe('Website Inspector & Brand Collaboration Evidence Architecture Unit Tests', () => {

  describe('Website Inspector Unit Tests', () => {
    it('1. should evaluate legitimate website with valid TLS and DNS as SAFE', async () => {
      // Test with clean, known domain
      const result = await WebsiteService.analyzeWebsite('https://example.com');

      expect(result).toHaveProperty('verdict');
      expect(['SAFE', 'REVIEW']).toContain(result.verdict);
      expect(result.overallTrustScore).toBeGreaterThanOrEqual(70);
      expect(Array.isArray(result.evidenceList)).toBe(true);
      expect(result.evidenceList.length).toBeGreaterThan(0);
    }, 10000);

    it('2. should detect suspicious website with high-risk TLD or auth keywords as HIGH_RISK or REVIEW', async () => {
      const result = await WebsiteService.analyzeWebsite('https://paypal-verify-account.top');

      expect(result).toHaveProperty('verdict');
      expect(['HIGH_RISK', 'REVIEW']).toContain(result.verdict);
      expect(result.evidenceList.some((e) => e.signal === 'WEBSITE_SUSPICIOUS_TLD' || e.signal === 'WEBSITE_SUSPICIOUS_URL_PATTERN')).toBe(true);
    }, 10000);

    it('3. should reject malformed URL format gracefully', async () => {
      await expect(WebsiteService.analyzeWebsite('   ')).rejects.toThrow();
    });

    it('4. should flag HTTP unencrypted website for missing TLS', async () => {
      const result = await WebsiteService.analyzeWebsite('http://example.com');

      expect(result).toHaveProperty('verdict');
      const tlsEvidence = result.evidenceList.find((e) => e.signal === 'WEBSITE_HTTPS_TLS');
      expect(tlsEvidence).toBeDefined();
      expect(tlsEvidence.source).toBe('TLS');
    }, 10000);

    it('5. should flag IP-based URL structure', async () => {
      const result = await WebsiteService.analyzeWebsite('http://198.51.100.5');

      const ipEvidence = result.evidenceList.find((e) => e.signal === 'WEBSITE_IP_URL');
      expect(ipEvidence).toBeDefined();
      expect(ipEvidence.source).toBe('URL');
      expect(ipEvidence.assessment).toBe('HIGH_RISK');
    }, 10000);
  });

  describe('Brand Collaboration Unit Tests', () => {
    it('6. should detect mismatched sender domain when free email is used for commercial brand', async () => {
      const payload = {
        brandName: 'Nike',
        brandWebsiteUrl: 'https://nike.com',
        senderEmail: 'marketing.john@gmail.com',
        collaborationText: 'Hi, we would like to offer you a sponsorship for Nike gear.',
      };

      const result = await CreatorService.analyzeBrandCollaboration(payload);

      expect(result.verdict).toBe('HIGH_RISK');
      const mismatchEvidence = result.evidenceList.find((e) => e.signal === 'COLLAB_SENDER_EMAIL_DOMAIN_MISMATCH');
      expect(mismatchEvidence).toBeDefined();
      expect(mismatchEvidence.source).toBe('EMAIL');
      expect(result.creatorExplanation.whySuspicious.some((w) => w.includes('gmail.com'))).toBe(true);
    });

    it('7. should evaluate legitimate brand collaboration as SAFE', async () => {
      const payload = {
        brandName: 'Nike',
        brandWebsiteUrl: 'https://nike.com',
        senderEmail: 'sponsorships@nike.com',
        collaborationText: 'Official sponsorship agreement from Nike for fall collection review.',
      };

      const result = await CreatorService.analyzeBrandCollaboration(payload);

      expect(['SAFE', 'REVIEW']).toContain(result.verdict);
      expect(result.collaborationTrustScore).toBeGreaterThanOrEqual(70);
      expect(result.creatorExplanation).toHaveProperty('actionableAdvice');
    });

    it('8. should detect suspicious collaboration with upfront fees and free email as HIGH_RISK', async () => {
      const payload = {
        brandName: 'Adidas',
        brandWebsiteUrl: 'https://adidas-promo.xyz',
        senderEmail: 'sponsorships@gmail.com',
        collaborationText: 'We will pay you $50,000! Please pay a $50 processing fee upfront via crypto gift card.',
      };

      const result = await CreatorService.analyzeBrandCollaboration(payload);

      expect(result.verdict).toBe('HIGH_RISK');
      expect(result.collaborationTrustScore).toBeLessThan(50);
      expect(result.evidenceList.some((e) => e.signal === 'COLLAB_UNREALISTIC_PAYMENT_FEES')).toBe(true);
      expect(result.creatorExplanation.whySuspicious.some((w) => w.includes('upfront payment'))).toBe(true);
    });
  });
});
