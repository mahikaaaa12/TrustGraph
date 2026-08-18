/**
 * Dedicated AI Generation Detector Service for Documents & Text Content
 * Evaluates explicit self-disclosures, synthetic content declarations, document metadata,
 * and stylometric language heuristics using a hybrid heuristic approach.
 */
class AiGenerationDetector {
  /**
   * Explicit AI Disclosure Patterns
   * Matches statements where a document explicitly declares that it is AI-generated.
   */
  static EXPLICIT_DISCLOSURE_PATTERNS = [
    /\b(?:generated|created|written|produced|authored|crafted|drafted)\s+(?:entirely\s+|completely\s+|partially\s+)?(?:by|using|with)\s+(?:ai|artificial\s+intelligence|chatgpt|gpt-?4|claude|gemini|llm|large\s+language\s+model)\b/i,
    /\b(?:ai-generated|ai\s+generated|created\s+by\s+ai|written\s+by\s+ai|produced\s+by\s+artificial\s+intelligence)\b/i,
    /\bthis\s+document\s+is\s+(?:an?\s+)?(?:ai-generated|synthetic|fictional|ai\s+generated)\b/i,
    /\b(?:created|generated)\s+for\s+(?:trustgraph|ai|system|security)\s+testing\b/i,
    /\b(?:fictional\s+data|synthetic\s+document|synthetic\s+data)\s+(?:generated|created)\s+by\s+ai\b/i,
  ];

  /**
   * Synthetic / Fictional Content Patterns
   * Matches statements declaring synthetic datasets, fictional entities, or demonstration content.
   */
  static SYNTHETIC_CONTENT_PATTERNS = [
    /\b(?:fictional|synthetic)\s+(?:organization|company|corporation|entity|dataset|data|report|review\s+period)\b/i,
    /\bdoes\s+not\s+(?:describe|represent)\s+a\s+real\s+(?:organization|company|person|entity|event)\b/i,
    /\bfor\s+(?:demonstration|testing|sample)\s+purposes?\s+only\b/i,
    /\bcompletely\s+synthetic\b/i,
    /\ball\s+(?:data|names|figures)\s+(?:are|is)\s+(?:fictional|synthetic|simulated)\b/i,
  ];

  /**
   * AI Mention Context Patterns (Subject Matter, NOT Self-Disclosure)
   * e.g., "AI is transforming healthcare" or "use of artificial intelligence in business"
   */
  static AI_SUBJECT_PATTERNS = [
    /\b(?:use|impact|role|growth|future|adoption|development|field|market|research)\s+of\s+(?:ai|artificial\s+intelligence)\b/i,
    /\b(?:ai|artificial\s+intelligence)\s+(?:in|for|is|will|can|has|technologies|solutions|tools)\b/i,
  ];

  /**
   * Canonical AI Transition Phrases (Secondary Stylometric Signals)
   */
  static STYLOMETRIC_AI_PHRASES = [
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
    'overall performance',
    'strategic alignment',
  ];

  /**
   * Master AI Generation Detection Pipeline
   */
  static detectAiGeneration(text = '', metadata = {}) {
    const textLower = text.toLowerCase();
    const signals = [];

    let likelihood = 0.05;
    let confidence = 0.70;

    // 1. Check for Explicit AI Disclosure Signals (Phase 3 - Strongest Signal)
    let hasExplicitDisclosure = false;
    let disclosureMatchText = '';

    for (const pattern of this.EXPLICIT_DISCLOSURE_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        hasExplicitDisclosure = true;
        disclosureMatchText = match[0];
        break;
      }
    }

    if (hasExplicitDisclosure) {
      likelihood = 0.99;
      confidence = 0.99;
      signals.push({
        type: 'explicit_ai_disclosure',
        severity: 'very_high',
        confidence: 0.99,
        description: 'Document explicitly identifies itself as AI-generated.',
        evidence: `Matched disclosure: "${disclosureMatchText}"`,
      });
    }

    // 2. Check for Synthetic / Fictional Content Signals (Phase 4)
    let hasSyntheticDeclaration = false;
    let syntheticMatchText = '';

    for (const pattern of this.SYNTHETIC_CONTENT_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        hasSyntheticDeclaration = true;
        syntheticMatchText = match[0];
        break;
      }
    }

    if (hasSyntheticDeclaration) {
      if (!hasExplicitDisclosure) {
        likelihood = Math.max(likelihood, 0.75);
        confidence = Math.max(confidence, 0.88);
      }
      signals.push({
        type: 'synthetic_content',
        severity: 'high',
        confidence: 0.90,
        description: 'Document identifies its contents as synthetic or fictional.',
        evidence: `Matched declaration: "${syntheticMatchText}"`,
      });
    }

    // 3. Check Document Metadata Signals (Phase 5)
    const creatorStr = `${metadata.creator || ''} ${metadata.author || ''} ${metadata.producer || ''}`.toLowerCase();
    const aiMetadataTool = ['chatgpt', 'openai', 'claude', 'midjourney', 'dall-e', 'langchain', 'auto-gpt'].find(
      (tool) => creatorStr.includes(tool)
    );

    if (aiMetadataTool) {
      if (!hasExplicitDisclosure) {
        likelihood = Math.max(likelihood, 0.80);
        confidence = Math.max(confidence, 0.85);
      }
      signals.push({
        type: 'metadata_signature',
        severity: 'medium',
        confidence: 0.85,
        description: `Document metadata explicitly attributes creation software tool: "${aiMetadataTool}".`,
      });
    }

    // 4. Stylometric & Vocabulary Signals (Phase 6 - Secondary/Limited Weight)
    const words = textLower.match(/\b[a-z']+\b/g) || [];
    let matchedPhrasesCount = 0;
    this.STYLOMETRIC_AI_PHRASES.forEach((phrase) => {
      if (textLower.includes(phrase)) matchedPhrasesCount++;
    });

    // Check sentence length variance (burstiness)
    const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
    const sentenceLengths = sentences.map((s) => (s.match(/\b\w+\b/g) || []).length);
    const meanLen = sentenceLengths.reduce((a, b) => a + b, 0) / (sentenceLengths.length || 1);
    const variance = sentenceLengths.reduce((sq, n) => sq + Math.pow(n - meanLen, 2), 0) / (sentenceLengths.length || 1);
    const burstiness = Math.sqrt(variance);

    if (!hasExplicitDisclosure && !hasSyntheticDeclaration) {
      // Small likelihood bump for stylometric features
      if (matchedPhrasesCount >= 3) {
        likelihood += 0.15;
        signals.push({
          type: 'stylometric_heuristic',
          severity: 'low',
          confidence: 0.65,
          description: `Document uses multiple canonical transition patterns (${matchedPhrasesCount} phrases).`,
        });
      }

      if (burstiness < 4.0 && words.length > 50) {
        likelihood += 0.10;
        signals.push({
          type: 'low_burstiness',
          severity: 'low',
          confidence: 0.60,
          description: 'Low sentence length variance across paragraphs.',
        });
      }
    }

    // 5. Subject-Matter Guard against False Positives (Phase 7)
    // If "AI" is mentioned as a subject without explicit self-disclosure, ensure likelihood remains low
    const isSubjectMatterMention = !hasExplicitDisclosure && this.AI_SUBJECT_PATTERNS.some((p) => p.test(text));
    if (isSubjectMatterMention && !hasSyntheticDeclaration && !aiMetadataTool) {
      likelihood = Math.min(likelihood, 0.25); // Clamp likelihood to low
    }

    // Clamp final values
    likelihood = Math.min(0.99, parseFloat(Math.max(0.01, likelihood).toFixed(2)));
    confidence = Math.min(0.99, parseFloat(Math.max(0.10, confidence).toFixed(2)));

    // Determine Classification
    let classification = 'LOW';
    if (likelihood >= 0.85) classification = 'VERY_HIGH';
    else if (likelihood >= 0.65) classification = 'HIGH';
    else if (likelihood >= 0.35) classification = 'MEDIUM';

    const detected = classification === 'VERY_HIGH' || classification === 'HIGH';

    // Summary Explanation
    let explanation = 'Document exhibits natural human writing characteristics and varied sentence structure.';
    if (hasExplicitDisclosure) {
      explanation = 'Document explicitly declares that it was generated by AI or created for synthetic testing.';
    } else if (hasSyntheticDeclaration) {
      explanation = 'Document explicitly identifies its contents as synthetic or fictional demonstration data.';
    } else if (classification === 'HIGH' || classification === 'MEDIUM') {
      explanation = 'Document contains elevated stylometric or structural features indicative of AI generation.';
    }

    return {
      detected,
      likelihood,
      confidence,
      classification,
      method: 'hybrid_heuristic',
      signals,
      explanation,
      limitations:
        'AI-generation detection is probabilistic based on explicit disclosures, metadata, and stylometric heuristics. It should not be treated as definitive proof.',
    };
  }
}

module.exports = AiGenerationDetector;
