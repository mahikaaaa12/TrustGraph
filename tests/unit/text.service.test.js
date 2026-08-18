const TextService = require('../../src/services/text.service');

describe('TextService Unit Tests', () => {
  describe('detectSocialEngineering()', () => {
    it('should NOT classify routine password update instructions as social engineering threats', () => {
      const text = 'Please update your password when you log in to your account dashboard.';
      const result = TextService.detectSocialEngineering(text);

      expect(result.detected).toBe(false);
      expect(result.classification).toBe('LOW');
    });

    it('should classify urgent threat language combined with OTP/password demands as CRITICAL social engineering', () => {
      const text = 'ACCOUNT TERMINATION ALERT: Your account will be permanently deleted within 10 minutes. Click here immediately to enter your password and OTP.';
      const result = TextService.detectSocialEngineering(text);

      expect(result.detected).toBe(true);
      expect(result.classification).toBe('CRITICAL');
    });
  });

  describe('evaluateTextSecurityRisk()', () => {
    it('should assign LOW/MEDIUM risk to AI-generated text if no malicious threats exist', () => {
      const aiAssessment = { detected: true, likelihood: 0.95 };
      const socialEngAssessment = { detected: false };
      const fakeNewsResults = { isLikelyFakeNews: false };

      const result = TextService.evaluateTextSecurityRisk(aiAssessment, socialEngAssessment, fakeNewsResults);

      expect(result.riskLevel).toBe('LOW');
      expect(result.reasons.some((r) => r.includes('AI generation'))).toBe(true);
    });
  });
});
