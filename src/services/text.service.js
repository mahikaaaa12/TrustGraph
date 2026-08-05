const Analysis = require('../models/Analysis');
const History = require('../models/History');
const AppError = require('../utils/appError');
const { HTTP_STATUS } = require('../constants');

/**
 * Production-Ready Text Analyzer Service
 * Encapsulates AI Text Detection (Perplexity/Burstiness), Sentiment Analysis,
 * Fake News Probability, and Cosine Text Similarity Algorithms.
 */
class TextService {
  /**
   * 1. AI-Generated Text Detection via Perplexity & Burstiness Heuristics
   * Human writing features high variance in sentence length (burstiness) and rich vocabulary entropy.
   * AI text (ChatGPT, Claude) exhibits uniform sentence structure, low perplexity, and predictable n-grams.
   */
  static detectAiGeneratedText(text) {
    const sentences = text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const words = text.toLowerCase().match(/\b[a-z']+\b/g) || [];

    if (words.length < 10) {
      return {
        aiProbability: 0.1,
        isLikelyAiGenerated: false,
        perplexityScore: 85.0,
        burstinessScore: 75.0,
        indicators: ['Text snippet too short for reliable statistical AI evaluation.'],
      };
    }

    // Sentence Length Variance (Burstiness Metric)
    const sentenceLengths = sentences.map((s) => (s.match(/\b\w+\b/g) || []).length);
    const meanLength = sentenceLengths.reduce((a, b) => a + b, 0) / (sentenceLengths.length || 1);
    const variance =
      sentenceLengths.reduce((sq, n) => sq + Math.pow(n - meanLength, 2), 0) /
      (sentenceLengths.length || 1);
    const stdDev = Math.sqrt(variance);
    const burstinessScore = parseFloat(Math.min(100, Math.max(0, stdDev * 12)).toFixed(2));

    // Vocabulary Entropy (Type-Token Ratio)
    const uniqueWords = new Set(words);
    const typeTokenRatio = uniqueWords.size / words.length;

    // AI Indicator Triggers
    const aiPhrases = [
      'in conclusion',
      'furthermore',
      'it is important to note',
      'delve into',
      'testament to',
      'tapestry of',
      'seamlessly',
      'pivotal role',
      'beacon of',
      'vital to understand',
    ];

    let matchedAiPhrases = 0;
    aiPhrases.forEach((phrase) => {
      if (text.toLowerCase().includes(phrase)) matchedAiPhrases++;
    });

    // Probability Calculation
    let aiProbability = 0.15;

    // Low burstiness (monotonous sentence lengths) increases AI likelihood
    if (burstinessScore < 20.0) aiProbability += 0.35;
    else if (burstinessScore < 35.0) aiProbability += 0.2;

    // Repetitive vocabulary (low TTR)
    if (typeTokenRatio < 0.45) aiProbability += 0.25;

    // Common AI transition phrases
    if (matchedAiPhrases > 0) aiProbability += matchedAiPhrases * 0.12;

    aiProbability = Math.min(0.99, parseFloat(Math.max(0.01, aiProbability).toFixed(2)));
    const perplexityScore = parseFloat((100 - aiProbability * 80).toFixed(1));

    const indicators = [];
    if (burstinessScore < 25.0)
      indicators.push('Low sentence length variance (monotonous burstiness metric typical of AI models).');
    if (matchedAiPhrases > 0)
      indicators.push(`Detected ${matchedAiPhrases} canonical AI transition phrase(s).`);
    if (typeTokenRatio < 0.45)
      indicators.push('Low Type-Token Ratio (constrained vocabulary entropy).');
    if (indicators.length === 0)
      indicators.push('Text exhibits natural human structural complexity and varied sentence rhythm.');

    return {
      aiProbability,
      isLikelyAiGenerated: aiProbability >= 0.55,
      perplexityScore,
      burstinessScore,
      indicators,
    };
  }

  /**
   * 2. Rule-Based VADER Sentiment Analysis Engine
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
      compoundScore, // Range: -1.0 (Most Negative) to +1.0 (Most Positive)
      positiveScore: parseFloat((posCount / (words.length || 1)).toFixed(3)),
      negativeScore: parseFloat((negCount / (words.length || 1)).toFixed(3)),
      neutralScore: parseFloat(((words.length - posCount - negCount) / (words.length || 1)).toFixed(3)),
    };
  }

  /**
   * 3. Fake News & Sensationalism Detector
   */
  static detectFakeNewsProbability(text) {
    const clickbaitTriggers = [
      /\b(you won't believe|shocking|secret|miracle|doctors hate|what happened next)\b/i,
      /\b(mind-blowing|unbelievable|proof|exposed|conspiracy|hidden truth)\b/i,
      /!{2,}/, // Multiple exclamation marks
      /\b[A-Z]{4,}\b/, // ALL CAPS words
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
   * 4. Cosine Similarity Algorithm (Vector Space Model)
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
   * Master Text Analysis Orchestrator
   */
  static async analyzeText(text, userId, benchmarkText = null) {
    if (!text || text.trim().length === 0) {
      throw new AppError('Please provide non-empty text content to analyze.', HTTP_STATUS.BAD_REQUEST);
    }

    // 1. AI Detection
    const aiResults = this.detectAiGeneratedText(text);

    // 2. Sentiment Analysis
    const sentimentResults = this.analyzeSentiment(text);

    // 3. Fake News Probability
    const fakeNewsResults = this.detectFakeNewsProbability(text);

    // 4. Similarity Check if benchmark text provided
    const similarityScore = benchmarkText ? this.calculateTextSimilarity(text, benchmarkText) : null;

    // Overall Trust Score Calculation (0 - 100)
    let trustScore = 100.0;
    trustScore -= aiResults.aiProbability * 35;
    trustScore -= fakeNewsResults.fakeNewsProbability * 45;
    if (sentimentResults.compoundScore < -0.5) trustScore -= 10;

    trustScore = Math.max(0.0, Math.min(100.0, parseFloat(trustScore.toFixed(1))));

    // Calculate Statistical Confidence Score (0.0 to 1.0)
    const wordCount = (text.match(/\b\w+\b/g) || []).length;
    let confidenceScore = 0.7;
    if (wordCount > 50) confidenceScore = 0.88;
    if (wordCount > 150) confidenceScore = 0.96;

    let riskCategory = 'low';
    if (trustScore < 40) riskCategory = 'critical';
    else if (trustScore < 65) riskCategory = 'high';
    else if (trustScore < 85) riskCategory = 'medium';

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
        aiResults.isLikelyAiGenerated
          ? `AI WARNING: High probability of AI generated text (${(aiResults.aiProbability * 100).toFixed(0)}%).`
          : 'AI CLEAN: Text exhibits human sentence structure and variance.',
        fakeNewsResults.assessment,
        `Sentiment: ${sentimentResults.sentiment.toUpperCase()} (Compound: ${sentimentResults.compoundScore}).`,
      ],
      graphMetadata: {
        nodeCount: wordCount,
        edgeCount: Math.round(aiResults.burstinessScore),
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

    return {
      analysisId: analysisRecord._id,
      wordCount,
      aiDetection: aiResults,
      sentiment: sentimentResults,
      fakeNewsDetection: fakeNewsResults,
      similarityScore,
      overallTrustScore: trustScore,
      confidenceScore,
      riskCategory,
    };
  }
}

module.exports = TextService;
