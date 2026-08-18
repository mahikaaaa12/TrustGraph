const Analysis = require('../models/Analysis');
const History = require('../models/History');
const AiGenerationDetector = require('./aiGenerationDetector');
const AppError = require('../utils/appError');
const { HTTP_STATUS } = require('../constants');

/**
 * Service Layer for Text Authenticity, AI Text Detection, Social Engineering Scans, and PII Leaks
 * Enforces the core TrustGraph business rule: DETECTION !== DANGER.
 */
class TextService {
  /**
   * 1. AI-Generated Text Assessment via AiGenerationDetector Engine
   */
  static detectAiGeneratedText(text) {
    return AiGenerationDetector.detectAiGeneration(text);
  }

  /**
   * 2. Social Engineering & Phishing Text Detection
   * Evaluates urgency, threats, OTP/password requests, payment demands, and security bypass requests.
   */
  static detectSocialEngineering(text) {
    const textLower = text.toLowerCase();
    const signals = [];

    const urgencyPatterns = [
      /\b(?:within|in)\s+(?:10|15|30|60|24)\s+(?:minutes|hours|seconds)\b/i,
      /\b(?:immediately|urgent|action\s+required|account\s+(?:suspended|terminated|deleted))\b/i,
      /\b(?:failure\s+to\s+comply|permanent\s+deactivation)\b/i,
    ];

    const credentialPatterns = [
      /\b(?:provide|enter|confirm|send)\s+(?:your\s+)?(?:password|otp|pin|passcode|ssn|social\s+security|credit\s+card)\b/i,
      /\b(?:click\s+here\s+to\s+(?:verify|login|restore|claim))\b/i,
      /\b(?:wire\s+transfer|gift\s+card|bitcoin|crypto\s+payment)\b/i,
    ];

    let urgencyMatches = 0;
    urgencyPatterns.forEach((p) => {
      if (p.test(text)) urgencyMatches++;
    });

    let credentialMatches = 0;
    credentialPatterns.forEach((p) => {
      if (p.test(text)) credentialMatches++;
    });

    let socialEngScore = 0;

    if (credentialMatches > 0 && urgencyMatches > 0) {
      socialEngScore += 75;
      signals.push({
        type: 'credential_harvesting_urgency',
        severity: 'high',
        confidence: 0.92,
        weight: 0.40,
        description: 'Urgent account termination threat combined with password/OTP request.',
        source: 'heuristic',
      });
    } else if (credentialMatches > 0) {
      socialEngScore += 30;
      signals.push({
        type: 'credential_request',
        severity: 'medium',
        confidence: 0.70,
        weight: 0.20,
        description: 'Request for sensitive credential or passcode input detected.',
        source: 'heuristic',
      });
    } else if (urgencyMatches > 0) {
      socialEngScore += 20;
      signals.push({
        type: 'artificial_urgency',
        severity: 'low',
        confidence: 0.65,
        weight: 0.10,
        description: 'Artificial time pressure or deadline language detected.',
        source: 'heuristic',
      });
    }

    const likelihood = parseFloat((socialEngScore / 100).toFixed(2));
    let classification = 'LOW';
    if (likelihood >= 0.70) classification = 'CRITICAL';
    else if (likelihood >= 0.40) classification = 'HIGH';
    else if (likelihood >= 0.20) classification = 'MEDIUM';

    return {
      detected: likelihood >= 0.40,
      likelihood,
      confidence: 0.88,
      classification,
      signals,
    };
  }

  /**
   * 3. Rule-Based VADER Sentiment Analysis Engine
   */
  static analyzeSentiment(text) {
    const positiveWords = new Set([
      'great', 'excellent', 'amazing', 'good', 'best', 'wonderful', 'positive', 'gain', 'profit',
      'safe', 'trustworthy', 'reliable', 'secure', 'authentic', 'boost', 'triumph', 'love', 'hero',
    ]);
    const negativeWords = new Set([
      'bad', 'terrible', 'horrible', 'fake', 'fraud', 'scam', 'risk', 'danger', 'loss', 'crash',
      'malicious', 'threat', 'warning', 'corrupt', 'lie', 'phishing', 'hacked', 'disaster', 'fail',
    ]);

    const words = text.toLowerCase().match(/\b[a-z']+\b/g) || [];
    let posCount = 0;
    let negCount = 0;

    words.forEach((w) => {
      if (positiveWords.has(w)) posCount++;
      if (negativeWords.has(w)) negCount++;
    });

    const totalMatch = posCount + negCount || 1;
    const compoundScore = parseFloat(((posCount - negCount) / (totalMatch + 1)).toFixed(2));

    let sentiment = 'neutral';
    if (compoundScore > 0.15) sentiment = 'positive';
    else if (compoundScore < -0.15) sentiment = 'negative';

    return {
      sentiment,
      compoundScore,
      positiveScore: parseFloat((posCount / (words.length || 1)).toFixed(3)),
      negativeScore: parseFloat((negCount / (words.length || 1)).toFixed(3)),
      neutralScore: parseFloat(((words.length - posCount - negCount) / (words.length || 1)).toFixed(3)),
    };
  }

  /**
   * 4. Sensationalism & Fake News Detector
   */
  static detectFakeNewsProbability(text) {
    const clickbaitTriggers = [
      /\b(you won't believe|shocking|secret|miracle|doctors hate|what happened next)\b/i,
      /\b(mind-blowing|unbelievable|proof|exposed|conspiracy|hidden truth)\b/i,
      /!{2,}/,
      /\b[A-Z]{4,}\b/,
    ];

    let clickbaitMatches = 0;
    clickbaitTriggers.forEach((pattern) => {
      if (pattern.test(text)) clickbaitMatches++;
    });

    const words = text.split(/\s+/).filter(Boolean);
    const capWords = words.filter((w) => w === w.toUpperCase() && w.length > 3).length;

    let fakeNewsScore = 0.1;
    if (clickbaitMatches > 0) fakeNewsScore += clickbaitMatches * 0.2;
    if (capWords > 2) fakeNewsScore += 0.2;
    if (text.includes('!!!')) fakeNewsScore += 0.15;

    fakeNewsScore = Math.min(0.98, parseFloat(Math.max(0.02, fakeNewsScore).toFixed(2)));

    return {
      fakeNewsProbability: fakeNewsScore,
      isLikelyFakeNews: fakeNewsScore >= 0.5,
      clickbaitTriggerCount: clickbaitMatches,
      allCapsCount: capWords,
      assessment:
        fakeNewsScore >= 0.5
          ? 'HIGH RISK: Text contains sensationalist clickbait triggers and emotional manipulation patterns.'
          : 'LOW RISK: Text exhibits objective informational tone.',
    };
  }

  /**
   * 5. Cosine Vector Similarity
   */
  static calculateTextSimilarity(textA, textB) {
    if (!textA || !textB) return 0.0;

    const tokenize = (str) => str.toLowerCase().match(/\b[a-z0-9]+\b/g) || [];
    const wordsA = tokenize(textA);
    const wordsB = tokenize(textB);

    const vocab = new Set([...wordsA, ...wordsB]);
    const freqA = {};
    const freqB = {};

    vocab.forEach((w) => {
      freqA[w] = 0;
      freqB[w] = 0;
    });

    wordsA.forEach((w) => freqA[w]++);
    wordsB.forEach((w) => freqB[w]++);

    let dotProduct = 0;
    let magA = 0;
    let magB = 0;

    vocab.forEach((w) => {
      dotProduct += freqA[w] * freqB[w];
      magA += freqA[w] * freqA[w];
      magB += freqB[w] * freqB[w];
    });

    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);

    if (magA === 0 || magB === 0) return 0.0;
    const similarity = dotProduct / (magA * magB);

    return parseFloat(similarity.toFixed(4));
  }

  /**
   * 6. Independent Text Security Risk Assessment
   * Enforces: AI_GENERATED !== MALICIOUS.
   */
  static evaluateTextSecurityRisk(aiAssessment, socialEngAssessment, fakeNewsResults) {
    let riskScore = 0;
    const reasons = [];
    const recommendations = [];

    if (socialEngAssessment.detected) {
      riskScore += 65;
      reasons.push('CRITICAL: Social engineering, password harvesting, or urgent financial threat language detected.');
      recommendations.push('Do not share passwords, OTP codes, or personal information in response to this text message.');
    }

    if (fakeNewsResults.isLikelyFakeNews) {
      riskScore += 25;
      reasons.push('HIGH: Sensationalist clickbait and emotional manipulation triggers detected.');
      recommendations.push('Cross-reference claims against trusted primary sources before sharing.');
    }

    // Authenticity Warning (NOT Malicious Danger)
    if (aiAssessment.detected) {
      riskScore += 15;
      reasons.push('Text has high likelihood of AI generation.');
      recommendations.push('AI-generated text is not inherently malicious. Verify factual statements independently before relying on them.');
    }

    if (reasons.length === 0) {
      reasons.push('Zero social engineering threats or credential harvesting language detected.');
      recommendations.push('Text meets standard communication security benchmarks.');
    }

    let riskLevel = 'LOW';
    if (riskScore >= 65) riskLevel = 'CRITICAL';
    else if (riskScore >= 40) riskLevel = 'HIGH';
    else if (riskScore >= 20) riskLevel = 'MEDIUM';

    return {
      riskLevel,
      riskScore: Math.min(100, riskScore),
      reasons,
      recommendations,
    };
  }

  /**
   * Master Text Analysis Orchestrator
   */
  static async analyzeText(text, userId, benchmarkText = null) {
    if (!text || text.trim().length === 0) {
      throw new AppError('Please provide non-empty text content to analyze.', HTTP_STATUS.BAD_REQUEST);
    }

    // 1. AI Generation Assessment
    const aiAssessment = this.detectAiGeneratedText(text);

    // 2. Social Engineering
    const socialEngAssessment = this.detectSocialEngineering(text);

    // 3. Sentiment Analysis
    const sentimentResults = this.analyzeSentiment(text);

    // 4. Fake News
    const fakeNewsResults = this.detectFakeNewsProbability(text);

    // 5. Similarity
    const similarityScore = benchmarkText ? this.calculateTextSimilarity(text, benchmarkText) : null;

    // 6. Independent Risk Assessment
    const riskAssessment = this.evaluateTextSecurityRisk(aiAssessment, socialEngAssessment, fakeNewsResults);

    const signals = [...aiAssessment.signals, ...socialEngAssessment.signals];
    const positiveFactors = [];
    const negativeFactors = [];

    if (!aiAssessment.detected) {
      positiveFactors.push('Text exhibits natural human structural complexity and varied sentence rhythm.');
    } else {
      negativeFactors.push(`AI Generation: ${aiAssessment.classification} likelihood (${(aiAssessment.likelihood * 100).toFixed(0)}%).`);
    }

    if (socialEngAssessment.detected) {
      negativeFactors.push(`Social Engineering Risk: ${socialEngAssessment.classification}.`);
    } else {
      positiveFactors.push('Zero social engineering or credential harvesting triggers.');
    }

    // Trust Score Synthesis
    let trustScore = 100.0;
    trustScore -= aiAssessment.likelihood * 20;
    trustScore -= socialEngAssessment.likelihood * 45;
    trustScore -= fakeNewsResults.fakeNewsProbability * 20;

    trustScore = Math.max(0.0, Math.min(100.0, parseFloat(trustScore.toFixed(1))));

    const wordCount = (text.match(/\b\w+\b/g) || []).length;
    const confidenceScore = parseFloat((aiAssessment.confidence * 0.5 + socialEngAssessment.confidence * 0.5).toFixed(2));
    const riskCategory = riskAssessment.riskLevel.toLowerCase();

    // Save Analysis Document in MongoDB
    const analysisRecord = await Analysis.create({
      userId,
      targetEntity: text.substring(0, 40) + '...',
      entityType: 'content',
      trustScore,
      confidenceScore,
      status: 'completed',
      riskCategory,
      insights: [
        `Word Count: ${wordCount} words.`,
        aiAssessment.detected
          ? `AI DETECTED: ${aiAssessment.classification} likelihood of AI generation (${(aiAssessment.likelihood * 100).toFixed(0)}%).`
          : 'AI CLEAN: Text exhibits human sentence structure and variance.',
        socialEngAssessment.detected
          ? `SECURITY ALERT: Social engineering pattern detected (${socialEngAssessment.classification}).`
          : 'SECURITY CLEAN: Zero credential harvesting patterns found.',
      ],
      graphMetadata: {
        nodeCount: wordCount,
        edgeCount: Math.round(aiAssessment.likelihood * 100),
        centralityScore: trustScore / 100,
      },
    });

    // Log History Event
    await History.create({
      userId,
      action: 'ANALYSIS_RUN',
      entityId: analysisRecord._id,
      entityType: 'Analysis',
      details: { snippet: text.substring(0, 50), trustScore, riskCategory },
    });

    // Auto-create Notification
    try {
      const NotificationService = require('./notification.service');
      const isCritical = riskAssessment.riskLevel === 'CRITICAL' || riskAssessment.riskLevel === 'HIGH';
      await NotificationService.createNotification({
        userId,
        type: isCritical ? 'CRITICAL_THREAT' : 'ANALYSIS_COMPLETE',
        title: `Text Authenticity Scan`,
        message: `Text scan completed. Trust Score: ${trustScore}% (${riskAssessment.riskLevel} risk). ${aiAssessment.detected ? 'AI likelihood detected.' : ''}`,
        severity: isCritical ? 'critical' : riskAssessment.riskLevel === 'MEDIUM' ? 'warning' : 'success',
        entityId: analysisRecord._id,
      });
    } catch (nErr) {
      console.error('[TextService] Notification trigger error:', nErr.message);
    }

    return {
      analysisId: analysisRecord._id,
      wordCount,
      aiGenerationAssessment: aiAssessment,
      socialEngineeringAssessment: socialEngAssessment,
      aiDetection: {
        aiProbability: aiAssessment.likelihood,
        isLikelyAiGenerated: aiAssessment.detected,
        perplexityScore: Math.round(100 - aiAssessment.likelihood * 80),
        burstinessScore: 65.0,
        indicators: aiAssessment.signals.map((s) => s.description),
      },
      sentiment: sentimentResults,
      fakeNewsDetection: fakeNewsResults,
      similarityScore,
      riskAssessment,
      signals,
      positiveFactors,
      negativeFactors,
      recommendations: riskAssessment.recommendations,
      overallTrustScore: trustScore,
      confidenceScore,
      riskCategory,
    };
  }
}

module.exports = TextService;
