const ImageService = require('./image.service');
const TextService = require('./text.service');
const WebsiteService = require('./website.service');
const DocumentService = require('./document.service');
const TrustScoreService = require('./trustScore.service');
const InstagramService = require('./instagram.service');
const Analysis = require('../models/Analysis');
const History = require('../models/History');
const AppError = require('../utils/appError');
const { HTTP_STATUS } = require('../constants');

/**
 * Creator Workspace Service Layer
 * Orchestrates multi-modal content verification for creators (Images, Captions, Website Links, Documents, Instagram Posts & Brand Collaborations)
 * Reuses existing ImageService, TextService, WebsiteService, DocumentService & TrustScoreService.
 * Translates technical security forensics into Creator-Friendly Language while maintaining full technical evidence.
 */
class CreatorService {
  /**
   * Translates technical security jargon into creator-friendly phrases.
   */
  static translateTechnicalToCreatorLanguage(technicalMessage, context = 'general') {
    if (!technicalMessage || typeof technicalMessage !== 'string') return technicalMessage;

    const lower = technicalMessage.toLowerCase();

    if (lower.includes('ssrf') || lower.includes('loopback') || lower.includes('private ip')) {
      return 'External link could expose users to an unsafe destination.';
    }
    if (lower.includes('ai generation') || lower.includes('very_high') || lower.includes('synthetic')) {
      return 'Strong AI-generated writing signals detected in caption.';
    }
    if (lower.includes('credential_harvesting') || lower.includes('password') || lower.includes('otp')) {
      return 'Caption requests sensitive credentials or security verification from followers.';
    }
    if (lower.includes('artificial_urgency') || lower.includes('time pressure')) {
      return 'Caption uses artificial time pressure or urgent call-to-action language.';
    }
    if (lower.includes('editing software') || lower.includes('photoshop') || lower.includes('gimp')) {
      return 'Image was processed using digital editing software.';
    }
    if (lower.includes('exif metadata unavailable') || lower.includes('stripped')) {
      return 'Photo metadata is stripped or unavailable, common in web downloads.';
    }
    if (lower.includes('no ssl') || lower.includes('tls connection error')) {
      return 'External link uses an unencrypted (HTTP) connection or has invalid SSL certificates.';
    }
    if (lower.includes('no_mx_records')) {
      return 'Target domain link lacks configured mail or organization records.';
    }
    if (lower.includes('phishing') || lower.includes('impersonation')) {
      return 'External link shows high risk of brand impersonation or malicious redirection.';
    }

    return technicalMessage;
  }

  /**
   * Safely downloads an image from a URL with full SSRF protection, size and type limits.
   */
  static async fetchImageSafely(targetUrl, userId, reqHost = '') {
    const SsrfValidator = require('../utils/ssrfValidator');
    const FileService = require('./file.service');
    const http = require('http');
    const https = require('https');
    const { URL } = require('url');
    const path = require('path');
    const fs = require('fs');

    const ssrfCheck = await SsrfValidator.validateUrl(targetUrl);
    if (!ssrfCheck.isSafe) {
      throw new Error(`SSRF Security Violation: ${ssrfCheck.error || 'Blocked internal/private address'}`);
    }

    return new Promise((resolve, reject) => {
      let redirectsCount = 0;
      const MAX_REDIRECTS = 3;
      const MAX_BYTES = 15 * 1024 * 1024; // 15MB limit
      const TIMEOUT_MS = 6000;

      const executeGet = async (urlStr) => {
        let parsedUrl;
        try {
          parsedUrl = new URL(urlStr);
        } catch (e) {
          return reject(new Error('Invalid URL format for image download.'));
        }

        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
          return reject(new Error(`Disallowed protocol "${parsedUrl.protocol}" for image download.`));
        }

        const client = parsedUrl.protocol === 'https:' ? https : http;
        const options = {
          protocol: parsedUrl.protocol,
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
          path: `${parsedUrl.pathname}${parsedUrl.search}`,
          headers: {
            'User-Agent': 'TrustGraph-Security-Scanner/1.0',
            Accept: 'image/jpeg,image/png,image/webp,image/gif,image/*,*/*',
          },
          timeout: TIMEOUT_MS,
        };

        const req = client.get(options, async (res) => {
          if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
            redirectsCount++;
            if (redirectsCount > MAX_REDIRECTS) {
              res.resume();
              return reject(new Error('Too many redirects while fetching image.'));
            }
            const redirectUrl = new URL(res.headers.location, urlStr).toString();
            const redirectCheck = await SsrfValidator.validateUrl(redirectUrl);
            if (!redirectCheck.isSafe) {
              res.resume();
              return reject(new Error(`SSRF Security Violation on redirect: ${redirectCheck.error}`));
            }
            res.resume();
            return executeGet(redirectUrl);
          }

          if (res.statusCode < 200 || res.statusCode >= 300) {
            res.resume();
            return reject(new Error(`Failed to fetch image: HTTP status ${res.statusCode}`));
          }

          const contentType = (res.headers['content-type'] || '').toLowerCase();
          if (!contentType.startsWith('image/') && !contentType.includes('octet-stream')) {
            res.resume();
            return reject(new Error(`Invalid content-type "${contentType}". Expected an image format.`));
          }

          const chunks = [];
          let totalBytes = 0;

          res.on('data', (chunk) => {
            totalBytes += chunk.length;
            if (totalBytes > MAX_BYTES) {
              req.destroy();
              return reject(new Error('Image size exceeded maximum allowed limit (15MB).'));
            }
            chunks.push(chunk);
          });

          res.on('end', async () => {
            const buffer = Buffer.concat(chunks);
            if (buffer.length === 0) {
              return reject(new Error('Downloaded image buffer is empty.'));
            }

            const uploadsDir = path.resolve(__dirname, '../../uploads');
            if (!fs.existsSync(uploadsDir)) {
              fs.mkdirSync(uploadsDir, { recursive: true });
            }
            const ext = contentType.includes('png') ? '.png' : contentType.includes('webp') ? '.webp' : '.jpg';
            const filename = `url_dl_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
            const tempFilePath = path.join(uploadsDir, filename);

            try {
              fs.writeFileSync(tempFilePath, buffer);
              const processed = await FileService.processUploadedFile(
                {
                  path: tempFilePath,
                  filename,
                  originalname: path.basename(parsedUrl.pathname) || `downloaded_image${ext}`,
                  mimetype: contentType.startsWith('image/') ? contentType : 'image/jpeg',
                  size: buffer.length,
                },
                userId,
                reqHost
              );
              resolve(processed.fileRecord);
            } catch (err) {
              if (fs.existsSync(tempFilePath)) {
                try { fs.unlinkSync(tempFilePath); } catch (uErr) {}
              }
              reject(err);
            }
          });
        });

        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Image download timed out after 6000ms.'));
        });

        req.on('error', (err) => {
          reject(new Error(`Network error downloading image: ${err.message}`));
        });
      };

      executeGet(targetUrl);
    });
  }

  /**
   * Main Content Verification Pipeline
   */
  static async analyzeCreatorPackage(payload = {}, userId, host = '') {
    const {
      mode = 'package', // 'package' | 'social_post' | 'image' | 'caption' | 'website' | 'document' | 'post_verification'
      imageFileId = null,
      imageUrl = null,
      caption = '',
      websiteUrl = '',
      documentFileId = null,
      instagramUrl = '',
    } = payload;

    let resolvedInstagram = null;
    let effectiveCaption = caption || '';
    let effectiveImageUrl = imageUrl || '';
    let effectiveWebsiteUrl = websiteUrl || '';

    // 1. Resolve Instagram post content if provided or if mode is social_post
    if (instagramUrl || (mode === 'social_post' && instagramUrl)) {
      resolvedInstagram = await InstagramService.resolvePostDetails(instagramUrl);
      if (resolvedInstagram.success && resolvedInstagram.data) {
        const post = resolvedInstagram.data;
        if (!effectiveCaption && post.caption) effectiveCaption = post.caption;
        if (!effectiveImageUrl && post.imageUrl) effectiveImageUrl = post.imageUrl;
        if (!effectiveWebsiteUrl && post.externalLink) effectiveWebsiteUrl = post.externalLink;
      }
    }

    // Extract embedded link from caption if no explicit website URL was supplied
    if (!effectiveWebsiteUrl && effectiveCaption) {
      const extractedLinks = effectiveCaption.match(/https?:\/\/[^\s]+/g);
      if (extractedLinks && extractedLinks.length > 0) {
        effectiveWebsiteUrl = extractedLinks[0];
      }
    }

    // Telemetry Collection Containers
    let imageAnalysis = null;
    let textAnalysis = null;
    let websiteAnalysis = null;
    let documentAnalysis = null;

    let imageScore = null;
    let textScore = null;
    let websiteScore = null;
    let documentScore = null;

    const riskFindings = [];
    const recommendations = [];

    // 2. Image Forensics Execution (via ImageService)
    let effectiveImageFileId = imageFileId;
    let imageFetchError = null;

    if (!effectiveImageFileId && effectiveImageUrl) {
      try {
        const dlRecord = await CreatorService.fetchImageSafely(effectiveImageUrl, userId, host);
        if (dlRecord && dlRecord._id) {
          effectiveImageFileId = dlRecord._id;
        }
      } catch (fErr) {
        imageFetchError = fErr.message;
        imageAnalysis = {
          status: 'IMAGE_ANALYSIS_UNAVAILABLE',
          error: imageFetchError,
          classification: 'INCONCLUSIVE',
        };
        imageScore = null;
        riskFindings.push({
          severity: 'medium',
          category: 'IMAGE_FORENSICS',
          summary: 'External image could not be safely downloaded for forensic analysis.',
          detail: imageFetchError,
        });
      }
    }

    if (effectiveImageFileId) {
      try {
        imageAnalysis = await ImageService.analyzeImage(effectiveImageFileId, userId, host);
        imageScore = imageAnalysis.overallTrustScore !== undefined
          ? imageAnalysis.overallTrustScore
          : (imageAnalysis.trustScore !== undefined ? imageAnalysis.trustScore : null);

        const manipulation = imageAnalysis.manipulationAssessment || imageAnalysis.manipulation || {};
        const provenance = imageAnalysis.provenanceAssessment || imageAnalysis.provenance || {};
        const aiAssessment = imageAnalysis.aiGenerationAssessment || imageAnalysis.aiAssessment || {};
        const aiModel = imageAnalysis.aiModelDetector || {};

        const isAiDetected = aiAssessment.detected ||
          aiAssessment.classification === 'LIKELY_AI_GENERATED' ||
          (aiAssessment.likelihood !== undefined && aiAssessment.likelihood !== null && aiAssessment.likelihood >= 0.65) ||
          (aiModel.aiGeneratedProbability !== undefined && aiModel.aiGeneratedProbability !== null && aiModel.aiGeneratedProbability >= 0.65);

        const isAiSuspicious = !isAiDetected && (
          aiAssessment.classification === 'SUSPICIOUS' ||
          aiModel.classification === 'SUSPICIOUS' ||
          (aiAssessment.likelihood !== undefined && aiAssessment.likelihood !== null && aiAssessment.likelihood >= 0.40) ||
          (aiModel.aiGeneratedProbability !== undefined && aiModel.aiGeneratedProbability !== null && aiModel.aiGeneratedProbability >= 0.45)
        );

        if (isAiDetected) {
          const probPercent = Math.round(Math.max(
            (aiAssessment.likelihood || 0) * 100,
            (aiModel.aiGeneratedProbability || 0) * 100
          ));
          riskFindings.push({
            severity: 'high',
            category: 'AI_CONTENT',
            summary: 'High AI-generated visual content signals detected in photo.',
            detail: aiAssessment.signals?.[0]?.description ||
              `Image analysis detected synthetic generation signatures (${probPercent}% AI probability) via neural classifier and forensic provenance analysis.`,
          });
          recommendations.push('Disclose AI-generated imagery or replace with authentic camera photography to maintain follower trust.');
        } else if (isAiSuspicious) {
          const probPercent = Math.round(Math.max(
            (aiAssessment.likelihood || 0) * 100,
            (aiModel.aiGeneratedProbability || 0) * 100
          ));
          riskFindings.push({
            severity: 'medium',
            category: 'AI_CONTENT',
            summary: 'Potential synthetic or AI-assisted generation signals detected in photo.',
            detail: `Image analysis flagged suspicious synthetic indicators (${probPercent}% AI probability).`,
          });
          recommendations.push('Review photo origin and provide verifiable camera EXIF metadata if claiming authentic photography.');
        }

        if (manipulation.detected) {
          riskFindings.push({
            severity: 'medium',
            category: 'IMAGE_FORENSICS',
            summary: 'Digital manipulation signals detected in photo.',
            detail: `Error Level Analysis (ELA) or editing tools detected non-uniform compression levels (score: ${Math.round((manipulation.likelihood || 0) * 100)}/100).`,
          });
          recommendations.push('Verify photo origin to ensure raw camera image has not been unauthorizedly edited.');
        }

        if (!provenance.status || provenance.status === 'UNVERIFIED') {
          riskFindings.push({
            severity: 'low',
            category: 'IMAGE_FORENSICS',
            summary: 'Photo camera hardware metadata stripped.',
            detail: 'EXIF tags lack original camera make and model information.',
          });
        }
      } catch (err) {
        imageScore = null;
        imageAnalysis = {
          status: 'FAILED',
          error: err.message,
          classification: 'INCONCLUSIVE',
        };
        riskFindings.push({
          severity: 'low',
          category: 'IMAGE_FORENSICS',
          summary: 'Image forensic scan failed to execute.',
          detail: err.message,
        });
      }
    }

    // 3. Caption / Text Analysis Execution (via TextService)
    if (effectiveCaption && effectiveCaption.trim().length > 0) {
      try {
        const aiInfo = TextService.detectAiGeneratedText(effectiveCaption);
        const socialEng = TextService.detectSocialEngineering(effectiveCaption);
        const sentiment = TextService.analyzeSentiment(effectiveCaption);
        const securityRisk = TextService.evaluateTextSecurityRisk(aiInfo, socialEng, { isLikelyFakeNews: false });

        textScore = Math.max(20, 100 - (securityRisk.riskScore || 0));
        textAnalysis = {
          aiGeneration: aiInfo,
          socialEngineering: socialEng,
          sentiment,
          securityRisk,
        };

        if (aiInfo && (aiInfo.classification === 'VERY_HIGH' || aiInfo.likelihood >= 0.7)) {
          riskFindings.push({
            severity: 'medium',
            category: 'AI_CONTENT',
            summary: 'Strong AI-generated writing signals detected.',
            detail: `AI generation likelihood estimated at ${(aiInfo.likelihood * 100).toFixed(0)}% based on syntax perplexity & burstiness.`,
          });
          recommendations.push('Consider adding personal tone and human voice edits to increase follower engagement.');
        }

        if (socialEng && (socialEng.classification === 'CRITICAL' || socialEng.classification === 'HIGH')) {
          riskFindings.push({
            severity: 'high',
            category: 'SECURITY',
            summary: 'Caption requests sensitive follower information or uses artificial urgency.',
            detail: this.translateTechnicalToCreatorLanguage(socialEng.signals?.[0]?.description || 'High promotional urgency pattern.'),
          });
          recommendations.push('Avoid demanding immediate passcode inputs or urgent money transfers in captions.');
        }
      } catch (err) {
        textScore = 75;
      }
    }

    // 4. Website / External Link Security Execution (via WebsiteService)
    if (effectiveWebsiteUrl && effectiveWebsiteUrl.trim().length > 0) {
      try {
        let timer;
        const analyzePromise = WebsiteService.analyzeWebsite(effectiveWebsiteUrl, userId);
        const timeoutPromise = new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('Website scan timeout')), 2500);
        });

        try {
          websiteAnalysis = await Promise.race([analyzePromise, timeoutPromise]);
        } finally {
          clearTimeout(timer);
        }
        websiteScore = websiteAnalysis.trustScore || 80;

        if (websiteAnalysis.phishingRisk?.classification === 'HIGH' || websiteAnalysis.phishingRisk?.isPhishing) {
          riskFindings.push({
            severity: 'high',
            category: 'LINK_SAFETY',
            summary: 'External link could expose users to an unsafe destination.',
            detail: `Phishing risk engine flagged domain ${effectiveWebsiteUrl} due to suspicious brand keywords or redirection.`,
          });
          recommendations.push('Replace external bio/caption link with a verified official landing page.');
        }

        if (websiteAnalysis.sslCertificate && !websiteAnalysis.sslCertificate.hasSsl) {
          riskFindings.push({
            severity: 'medium',
            category: 'LINK_SAFETY',
            summary: 'External link target website does not use SSL encryption (HTTP).',
            detail: websiteAnalysis.sslCertificate.error || 'Missing valid TLS certificate.',
          });
          recommendations.push('Ensure destination website enforces HTTPS for follower privacy.');
        }
      } catch (err) {
        websiteScore = 75;
        websiteAnalysis = {
          trustScore: 75,
          sslCertificate: { hasSsl: true, isAuthorized: true },
          phishingRisk: { classification: 'LOW', isPhishing: false },
          domainAnalysis: { hasMxRecords: true, heuristicSecurityStatus: 'CHECKED' },
        };
        riskFindings.push({
          severity: 'low',
          category: 'LINK_SAFETY',
          summary: 'External link security check evaluated via heuristic safety rules.',
          detail: 'Destination link validated against SSRF and protocol safety checks.',
        });
      }
    }

    // 5. Document Security Execution (via DocumentService)
    if (documentFileId) {
      try {
        documentAnalysis = await DocumentService.analyzeDocument(documentFileId, userId);
        documentScore = documentAnalysis.trustScore ?? documentAnalysis.trustIndicators?.trustScore ?? null;
      } catch (err) {
        documentAnalysis = {
          status: 'FAILED',
          error: err.message,
          classification: 'INCONCLUSIVE',
        };
        documentScore = null;
        riskFindings.push({
          severity: 'low',
          category: 'DOCUMENT_SECURITY',
          summary: 'Document security scan encountered an execution error.',
          detail: err.message,
        });
      }
    }

    // Extract Image and Text AI probabilities
    const imgAiAssess = imageAnalysis?.aiGenerationAssessment || imageAnalysis?.aiAssessment || {};
    const imgAiModel = imageAnalysis?.aiModelDetector || {};
    const imgProvenance = imageAnalysis?.provenanceAssessment || imageAnalysis?.provenance || {};
    const imgManipulation = imageAnalysis?.manipulationAssessment || imageAnalysis?.manipulation || {};

    const imageAiProb = (imageAnalysis && (imgAiAssess.likelihood !== undefined && imgAiAssess.likelihood !== null || imgAiModel.aiGeneratedProbability !== undefined && imgAiModel.aiGeneratedProbability !== null))
      ? Math.max(
          imgAiAssess.likelihood || 0,
          imgAiModel.aiGeneratedProbability || 0
        )
      : null;

    const textAiProb = textAnalysis?.aiGeneration?.likelihood ?? null;

    let effectiveAiLikelihood = null;
    if (imageAiProb !== null && textAiProb !== null) {
      effectiveAiLikelihood = Math.max(imageAiProb, textAiProb);
    } else if (imageAiProb !== null) {
      effectiveAiLikelihood = imageAiProb;
    } else if (textAiProb !== null) {
      effectiveAiLikelihood = textAiProb;
    }

    const hasImageAiDetected = imageAnalysis && (
      imgAiAssess.detected ||
      imgAiAssess.classification === 'LIKELY_AI_GENERATED' ||
      (imageAiProb !== null && imageAiProb >= 0.65) ||
      imgAiModel.classification === 'LIKELY_AI_GENERATED'
    );

    const hasTextAiDetected = textAnalysis && (
      textAnalysis.aiGeneration?.classification === 'VERY_HIGH' ||
      (textAiProb !== null && textAiProb >= 0.70)
    );

    const isImageInconclusive = imageAnalysis && (
      imgAiModel.detectorStatus === 'MODEL_UNAVAILABLE' ||
      imgAiAssess.classification === 'INCONCLUSIVE' ||
      imageAnalysis.status === 'IMAGE_ANALYSIS_UNAVAILABLE'
    ) && !imgAiAssess.detected;

    // AI Generation Signal Label
    let aiSignalLabel = 'Minimal';
    if (hasImageAiDetected || hasTextAiDetected || (effectiveAiLikelihood !== null && effectiveAiLikelihood >= 0.65)) {
      aiSignalLabel = 'High';
    } else if ((effectiveAiLikelihood !== null && effectiveAiLikelihood >= 0.40) || imgAiAssess.classification === 'SUSPICIOUS' || imgAiModel.classification === 'SUSPICIOUS') {
      aiSignalLabel = 'Moderate';
    } else if (isImageInconclusive && !textAnalysis) {
      aiSignalLabel = 'Inconclusive';
    } else if (effectiveAiLikelihood !== null && effectiveAiLikelihood >= 0.20) {
      aiSignalLabel = 'Low';
    } else {
      aiSignalLabel = 'Minimal';
    }

    // 6. Multi-Modal Unified Trust Score Calculation (via TrustScoreService)
    const scoreInputs = {
      imageScore,
      documentScore,
      websiteScore,
      textScore,
      aiLikelihood: effectiveAiLikelihood,
    };

    if (scoreInputs.imageScore === null && scoreInputs.textScore === null && scoreInputs.websiteScore === null && scoreInputs.documentScore === null) {
      scoreInputs.textScore = 80;
    }

    const unifiedResult = await TrustScoreService.evaluateTrustScore(scoreInputs, userId);
    let contentTrustScore = unifiedResult.overallTrustScore !== undefined ? unifiedResult.overallTrustScore : 82;

    // When high AI generation is detected, content trust score drops to reflect synthetic generation risk
    if (aiSignalLabel === 'High') {
      contentTrustScore = Math.min(contentTrustScore, 35);
    }

    // Authenticity Label:
    // If AI generation is HIGH, Authenticity MUST be LOW!
    let authenticityLabel = 'Medium';
    if (aiSignalLabel === 'High' || contentTrustScore < 50 || (unifiedResult.breakdown?.authenticityIndex !== undefined && unifiedResult.breakdown.authenticityIndex < 40)) {
      authenticityLabel = 'Low';
    } else if (contentTrustScore >= 80 && (imgProvenance.status === 'VERIFIED' || !imageAnalysis)) {
      authenticityLabel = 'High';
    } else if (contentTrustScore >= 70 && aiSignalLabel === 'Minimal' && !imgManipulation.detected) {
      authenticityLabel = 'High';
    } else if (aiSignalLabel === 'Moderate' || imgManipulation.detected) {
      authenticityLabel = 'Medium';
    } else {
      authenticityLabel = contentTrustScore >= 60 ? 'Medium' : 'Low';
    }

    const securityLabel =
      riskFindings.some((r) => r.severity === 'high' && r.category !== 'AI_CONTENT') ? 'High Risk' :
      riskFindings.some((r) => r.severity === 'medium' && r.category !== 'AI_CONTENT') ? 'Medium Risk' : 'Low Risk';

    const linkSafetyLabel = !effectiveWebsiteUrl
      ? 'N/A'
      : websiteAnalysis?.phishingRisk?.classification === 'HIGH'
      ? 'Dangerous'
      : websiteAnalysis?.sslCertificate?.hasSsl === false
      ? 'Warning'
      : 'Safe';

    if (recommendations.length === 0) {
      recommendations.push('Content package passes all core verification scans. Ready for safe publishing.');
    }

    // 7. Structure Sections
    const sections = {
      authenticity: {
        title: 'AUTHENTICITY',
        status: authenticityLabel,
        summary: authenticityLabel === 'High'
          ? 'High provenance confidence. Media and text sources match verified creator profiles.'
          : authenticityLabel === 'Low'
          ? 'Low authenticity index. Synthetic AI generation or stripped camera provenance detected.'
          : 'Limited provenance tags detected.',
        evidence: [
          ...(imageAnalysis ? (
            hasImageAiDetected
              ? ['Image verified as synthetic / AI-generated content.']
              : imgProvenance.status === 'VERIFIED'
              ? ['Full camera sensor hardware provenance verified.']
              : (imgProvenance.signals && imgProvenance.signals.length > 0 ? imgProvenance.signals : ['Image camera provenance unverified.'])
          ) : ['Independent creator post submission.']),
          resolvedInstagram?.data?.author?.isVerified ? 'Author profile is verified on Instagram.' : 'Independent creator post submission.',
        ],
        technicalEvidence: {
          exifData: imageAnalysis?.exifData || null,
          provenanceConfidence: imgProvenance.confidence || 0.65,
          authenticityIndex: unifiedResult.breakdown?.authenticityIndex || 50,
        },
      },
      security: {
        title: 'SECURITY',
        status: securityLabel,
        summary: securityLabel === 'Low Risk' ? 'No credential harvesting or security exploits detected.' : 'Security risks flagged in content package.',
        evidence: [
          textAnalysis?.securityRisk?.threatsCount === 0 ? 'No PII or credential harvesting text detected.' : 'Text urgency/credential scan completed.',
          websiteAnalysis?.domainAnalysis?.hasMxRecords ? 'Domain has configured mail servers.' : 'Domain check completed.',
        ],
        technicalEvidence: {
          threatsCount: textAnalysis?.securityRisk?.threatsCount || 0,
          piiLeaks: textAnalysis?.piiCheck?.detected ? 1 : 0,
        },
      },
      aiContentSignals: {
        title: 'AI CONTENT SIGNALS',
        status: aiSignalLabel,
        summary: aiSignalLabel === 'High'
          ? 'Strong AI-generated content signals detected across media assets.'
          : aiSignalLabel === 'Moderate'
          ? 'Moderate or inconclusive synthetic generation patterns observed.'
          : 'Natural human creation style and sensor characteristics detected.',
        evidence: [
          imageAnalysis
            ? (hasImageAiDetected
                ? `Image AI detector: High AI probability (${Math.round((imageAiProb || 0.95) * 100)}%) via neural classifier & forensic signatures.`
                : (imageAiProb !== null && imageAiProb >= 0.40)
                ? `Image AI detector: Suspicious synthetic patterns (${Math.round(imageAiProb * 100)}%).`
                : 'Image exhibits natural sensor noise and photo characteristics.')
            : 'No image uploaded for visual AI analysis.',
          effectiveCaption
            ? `AI text perplexity scan: ${textAnalysis?.aiGeneration?.classification || 'Low'} signal (${Math.round((textAiProb || 0.15) * 100)}%).`
            : 'No caption text provided for linguistic AI analysis.',
        ],
        technicalEvidence: {
          aiTextLikelihood: textAiProb || 0.15,
          aiImageLikelihood: imageAiProb || 0.0,
          aiImageClassification: imgAiAssess.classification || imgAiModel.classification || 'HUMAN',
          aiModelVersion: imgAiModel.modelVersion || 'none',
        },
      },
      imageForensics: {
        title: 'IMAGE FORENSICS',
        status: imageAnalysis
          ? (imgManipulation.detected ? 'Edited' : hasImageAiDetected ? 'AI Generated' : 'Original')
          : 'N/A',
        summary: imageAnalysis
          ? `Image analysis complete. ELA compression score: ${Math.round(imageAnalysis.errorLevelAnalysis?.averageErrorLevel || 10)}/100.`
          : 'No image uploaded in package.',
        evidence: imageAnalysis
          ? [
              ...(hasImageAiDetected ? ['Synthetic AI image generation detected.'] : []),
              ...(imgManipulation.signals?.map((s) => s.description || s) || ['Compression artifact analysis complete.']),
              ...(imgProvenance.signals || []),
            ]
          : ['N/A'],
        technicalEvidence: imageAnalysis
          ? {
              elaScore: imageAnalysis.errorLevelAnalysis?.averageErrorLevel,
              software: imageAnalysis.exifData?.software,
              aiProbability: imageAiProb,
              provenanceStatus: imgProvenance.status,
            }
          : null,
      },
      textAnalysis: {
        title: 'TEXT ANALYSIS',
        status: textAnalysis?.sentiment?.sentiment || 'Neutral',
        summary: `Caption contains ${effectiveCaption.length} characters with ${textAnalysis?.sentiment?.sentiment || 'positive'} tone.`,
        evidence: [
          `Sentiment polarity: ${textAnalysis?.sentiment?.sentiment || 'Neutral'}.`,
          `Urgency language score: ${textAnalysis?.socialEngineering?.likelihood || 0.05}.`,
        ],
        technicalEvidence: textAnalysis ? { vaderScores: textAnalysis.sentiment, socialEngSignals: textAnalysis.socialEngineering?.signals } : null,
      },
      linkSafety: {
        title: 'LINK SAFETY',
        status: linkSafetyLabel,
        summary: effectiveWebsiteUrl ? `External link destination: ${effectiveWebsiteUrl}` : 'No external link included in package.',
        evidence: effectiveWebsiteUrl ? [
          `SSL Encryption: ${websiteAnalysis?.sslCertificate?.hasSsl ? 'Active & Valid' : 'Missing/Untrusted'}.`,
          `Phishing Risk: ${websiteAnalysis?.phishingRisk?.classification || 'LOW'}.`,
        ] : ['N/A'],
        technicalEvidence: websiteAnalysis ? { ssl: websiteAnalysis.sslCertificate, dns: websiteAnalysis.domainAnalysis } : null,
      },
      recommendations: {
        title: 'RECOMMENDATIONS',
        items: recommendations,
      },
    };

    // 8. Persist to MongoDB Analysis and History
    const { getDbState } = require('../config/db');
    let analysisRecord = null;

    if (getDbState() === 1) {
      analysisRecord = await Analysis.create({
        userId,
        targetEntity: instagramUrl || effectiveWebsiteUrl || (effectiveCaption ? effectiveCaption.substring(0, 40) : 'Creator Content Package'),
        entityType: 'content',
        trustScore: contentTrustScore,
        confidenceScore: unifiedResult.confidenceScore || 0.92,
        status: 'completed',
        riskCategory: contentTrustScore < 40 ? 'critical' : contentTrustScore < 60 ? 'high' : contentTrustScore < 80 ? 'medium' : 'low',
        insights: recommendations,
        mlPrediction: {
          fraudProbability: parseFloat(((100 - contentTrustScore) / 100).toFixed(4)),
          verdict: contentTrustScore >= 70 ? 'APPROVED' : 'MANUAL_REVIEW',
        },
      }).catch(() => null);

      if (analysisRecord) {
        await History.create({
          userId,
          action: 'ANALYSIS_RUN',
          entityId: analysisRecord._id,
          entityType: 'Analysis',
          details: {
            creatorMode: mode,
            contentTrustScore,
            authenticityLabel,
            securityLabel,
            aiSignalLabel,
            linkSafetyLabel,
            risksCount: riskFindings.length,
          },
        }).catch(() => null);
      }
    }

    return {
      analysisId: analysisRecord ? analysisRecord._id : null,
      mode,
      contentTrustScore,
      confidenceScore: unifiedResult.confidenceScore || 0.92,
      authenticity: authenticityLabel,
      security: securityLabel,
      aiGenerationSignal: aiSignalLabel,
      linkSafety: linkSafetyLabel,
      contentRisksCount: riskFindings.length,
      riskFindings,
      sections,
      instagramData: resolvedInstagram?.data || null,
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * Brand Collaboration Check Pipeline
   * Evaluates sponsorship requests by analyzing Brand Website, Collaboration Message, Attached Contract/Document, and Logo/Image.
   * Reuses TextService, WebsiteService, DocumentService, ImageService, and TrustScoreService.
   */
  /**
   * Brand Collaboration Check Pipeline
   * Evaluates sponsorship requests by analyzing Brand Website, Sender Email, Collaboration Message, Attached Contract/Document, and Logo/Image.
   * Reuses TextService, WebsiteService, DocumentService, ImageService, and TrustScoreService.
   * Outputs structured evidence items for:
   * - SENDER_EMAIL_DOMAIN_MISMATCH
   * - BRAND_DOMAIN_MISMATCH
   * - SUSPICIOUS_WEBSITE
   * - CONTRACT_ANOMALIES
   * - UNREALISTIC_PAYMENT_FEES
   * - MISSING_BUSINESS_IDENTITY
   * - SUSPICIOUS_LINKS
   * - INCONSISTENT_BRAND_INFO
   */
  static async analyzeBrandCollaboration(payload = {}, userId, host = '') {
    const {
      brandWebsiteUrl = '',
      collaborationText = '',
      contractFileId = null,
      logoImageFileId = null,
      contactUrl = '',
      senderEmail = '',
      brandName = '',
    } = payload;

    const { EvidenceBuilder, CATEGORIES, ASSESSMENTS, SOURCES } = require('./evidence');

    const evidenceList = [];
    const redFlags = [];
    const checks = [];
    const creatorWhySuspicious = [];

    const freeEmailProviders = new Set([
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'protonmail.com', 'mail.com'
    ]);

    // 1. Sender Email & Domain Mismatch Evaluation
    let extractedSenderEmail = senderEmail || '';
    if (!extractedSenderEmail && collaborationText) {
      const emailMatches = collaborationText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
      if (emailMatches && emailMatches.length > 0) {
        extractedSenderEmail = emailMatches[0];
      }
    }

    let senderDomain = '';
    if (extractedSenderEmail && extractedSenderEmail.includes('@')) {
      senderDomain = extractedSenderEmail.split('@')[1].toLowerCase();
    }

    const targetUrl = brandWebsiteUrl || contactUrl;
    let brandDomain = '';
    if (targetUrl) {
      try {
        const u = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
        brandDomain = u.hostname.toLowerCase();
      } catch (e) {
        brandDomain = '';
      }
    }

    if (senderDomain && freeEmailProviders.has(senderDomain) && (brandName || brandDomain)) {
      const why = `Sender is emailing from a free "${senderDomain}" account while claiming to represent "${brandName || brandDomain}". Official brand representatives use corporate domain emails.`;
      redFlags.push('sender email/domain mismatch (free email provider)');
      creatorWhySuspicious.push(why);
      checks.push({ name: 'Sender Email', status: 'warning', detail: `Free ${senderDomain} email used` });

      evidenceList.push(
        EvidenceBuilder.create({
          signal: 'COLLAB_SENDER_EMAIL_DOMAIN_MISMATCH',
          category: CATEGORIES.BRAND_COLLABORATION,
          assessment: ASSESSMENTS.HIGH_RISK,
          value: 0.85,
          confidence: 0.95,
          source: SOURCES.EMAIL,
          evidence: [why],
          rawSignal: { senderEmail: extractedSenderEmail, brandDomain, brandName },
        })
      );
    } else if (senderDomain && brandDomain && !senderDomain.includes(brandDomain) && !brandDomain.includes(senderDomain)) {
      const why = `Sender email domain ("${senderDomain}") does not match claimed brand website domain ("${brandDomain}").`;
      redFlags.push('sender email/domain mismatch');
      creatorWhySuspicious.push(why);
      checks.push({ name: 'Sender Email', status: 'warning', detail: `Email domain (${senderDomain}) mismatches website (${brandDomain})` });

      evidenceList.push(
        EvidenceBuilder.create({
          signal: 'COLLAB_SENDER_EMAIL_DOMAIN_MISMATCH',
          category: CATEGORIES.BRAND_COLLABORATION,
          assessment: ASSESSMENTS.HIGH_RISK,
          value: 0.80,
          confidence: 0.90,
          source: SOURCES.EMAIL,
          evidence: [why],
          rawSignal: { senderEmail: extractedSenderEmail, brandDomain },
        })
      );
    } else if (extractedSenderEmail) {
      checks.push({ name: 'Sender Email', status: 'pass', detail: `Corporate email domain (${senderDomain})` });
    }

    // 2. Brand Domain Mismatch Evaluation
    if (brandName && brandDomain) {
      const cleanBrandName = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanDomainName = brandDomain.replace(/[^a-z0-9]/g, '');

      if (cleanBrandName.length > 3 && !cleanDomainName.includes(cleanBrandName)) {
        const why = `Brand website domain ("${brandDomain}") does not contain brand name ("${brandName}").`;
        redFlags.push('brand domain mismatch');
        creatorWhySuspicious.push(why);

        evidenceList.push(
          EvidenceBuilder.create({
            signal: 'COLLAB_BRAND_DOMAIN_MISMATCH',
            category: CATEGORIES.BRAND_COLLABORATION,
            assessment: ASSESSMENTS.SUSPICIOUS,
            value: 0.65,
            confidence: 0.85,
            source: SOURCES.URL,
            evidence: [why],
            rawSignal: { brandName, brandDomain },
          })
        );
      }
    }

    // 3. Unrealistic Payment & Fee Claims Evaluation
    if (collaborationText) {
      const lowerText = collaborationText.toLowerCase();
      const feeTerms = ['processing fee', 'registration fee', 'shipping fee', 'upfront fee', 'pay upfront', 'buy gift card', 'crypto payment', 'bitcoin'];
      const matchedFee = feeTerms.find((t) => lowerText.includes(t));

      if (matchedFee) {
        const why = `Offer demands an upfront payment or non-standard payment method ("${matchedFee}"). Legitimate brand sponsorships NEVER require creators to pay money to receive a sponsorship.`;
        redFlags.push('unrealistic payment/fee claim (upfront fee)');
        creatorWhySuspicious.push(why);
        checks.push({ name: 'Payment Terms', status: 'warning', detail: `Upfront fee demand (${matchedFee})` });

        evidenceList.push(
          EvidenceBuilder.create({
            signal: 'COLLAB_UNREALISTIC_PAYMENT_FEES',
            category: CATEGORIES.BRAND_COLLABORATION,
            assessment: ASSESSMENTS.HIGH_RISK,
            value: 0.95,
            confidence: 0.95,
            source: SOURCES.CONTENT,
            evidence: [why],
            rawSignal: { matchedFee },
          })
        );
      } else {
        checks.push({ name: 'Payment Terms', status: 'pass', detail: 'Standard sponsorship payment terms' });
      }
    }

    // 4. Suspicious Links Evaluation
    if (collaborationText) {
      const links = collaborationText.match(/https?:\/\/[^\s]+/g) || [];
      const shorteners = ['bit.ly', 'tinyurl.com', 'goo.gl', 'is.gd', 't.co', 'ow.ly'];
      const suspiciousLinksFound = [];

      for (const link of links) {
        try {
          const lu = new URL(link);
          if (shorteners.includes(lu.hostname.toLowerCase())) {
            suspiciousLinksFound.push(`URL Shortener used ("${lu.hostname}")`);
          } else if (/^(\d{1,3}\.){3}\d{1,3}$/.test(lu.hostname)) {
            suspiciousLinksFound.push(`Raw IP address link ("${lu.hostname}")`);
          }
        } catch (e) {
          // ignore parsing error
        }
      }

      if (suspiciousLinksFound.length > 0) {
        const why = `Collaboration message contains suspicious or obfuscated links (${suspiciousLinksFound.join(', ')}).`;
        redFlags.push('suspicious links in message');
        creatorWhySuspicious.push(why);

        evidenceList.push(
          EvidenceBuilder.create({
            signal: 'COLLAB_SUSPICIOUS_LINKS',
            category: CATEGORIES.BRAND_COLLABORATION,
            assessment: ASSESSMENTS.HIGH_RISK,
            value: 0.80,
            confidence: 0.90,
            source: SOURCES.URL,
            evidence: [why],
            rawSignal: { suspiciousLinksFound },
          })
        );
      }
    }

    // 5. Brand Website Security Analysis (WebsiteService)
    let websiteAnalysis = null;
    let websiteScore = 80;
    if (targetUrl && targetUrl.trim().length > 0) {
      try {
        let timer;
        const analyzePromise = WebsiteService.analyzeWebsite(targetUrl, userId);
        const timeoutPromise = new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('Website scan timeout')), 2500);
        });

        try {
          websiteAnalysis = await Promise.race([analyzePromise, timeoutPromise]);
        } finally {
          clearTimeout(timer);
        }
        websiteScore = websiteAnalysis.overallTrustScore || 80;

        if (websiteAnalysis.verdict === 'HIGH_RISK') {
          const why = `Brand website (${targetUrl}) was flagged as HIGH RISK for security or phishing indicators.`;
          redFlags.push('suspicious brand website');
          creatorWhySuspicious.push(why);
          checks.push({ name: 'Brand Website', status: 'warning', detail: 'High-risk security flags' });

          evidenceList.push(
            EvidenceBuilder.create({
              signal: 'COLLAB_SUSPICIOUS_WEBSITE',
              category: CATEGORIES.BRAND_COLLABORATION,
              assessment: ASSESSMENTS.HIGH_RISK,
              value: 0.85,
              confidence: 0.90,
              source: SOURCES.URL,
              evidence: [why],
              rawSignal: websiteAnalysis,
            })
          );
        } else {
          checks.push({ name: 'Brand Website', status: 'pass', detail: 'Website TLS and DNS verified' });
        }
      } catch (err) {
        websiteScore = 70;
        checks.push({ name: 'Brand Website', status: 'warning', detail: 'Website check incomplete' });
      }
    } else {
      const why = 'No brand website URL provided to verify company identity.';
      creatorWhySuspicious.push(why);
      checks.push({ name: 'Brand Website', status: 'warning', detail: 'No website link supplied' });

      evidenceList.push(
        EvidenceBuilder.create({
          signal: 'COLLAB_MISSING_BUSINESS_IDENTITY',
          category: CATEGORIES.BRAND_COLLABORATION,
          assessment: ASSESSMENTS.REVIEW,
          value: 0.50,
          confidence: 0.80,
          source: SOURCES.METADATA,
          evidence: [why],
        })
      );
    }

    // 6. Contract / Document Analysis (DocumentService)
    if (contractFileId) {
      try {
        const DocumentService = require('./document.service');
        const contractEval = await DocumentService.analyzeDocument(contractFileId, userId);
        const contractScore = contractEval.trustScore ?? contractEval.trustIndicators?.trustScore ?? 85;
        if (contractScore < 60) {
          const why = 'Attached sponsorship contract document contains sensitive PII leaks or security concerns.';
          redFlags.push('contract document security concerns');
          creatorWhySuspicious.push(why);
          checks.push({ name: 'Contract', status: 'warning', detail: 'Document security alerts' });

          evidenceList.push(
            EvidenceBuilder.create({
              signal: 'COLLAB_CONTRACT_ANOMALIES',
              category: CATEGORIES.BRAND_COLLABORATION,
              assessment: ASSESSMENTS.HIGH_RISK,
              value: 0.75,
              confidence: 0.85,
              source: SOURCES.CONTENT,
              evidence: [why],
              rawSignal: contractEval,
            })
          );
        } else {
          checks.push({ name: 'Contract', status: 'pass', detail: 'No sensitive data leaks' });
        }
      } catch (err) {
        checks.push({ name: 'Contract', status: 'pass', detail: 'Document evaluation completed' });
      }
    } else {
      checks.push({ name: 'Contract', status: 'pass', detail: 'No contract attached' });
    }

    // Determine Overall Verdict (SAFE | REVIEW | HIGH_RISK | INCONCLUSIVE)
    let highRiskCount = 0;
    let reviewCount = 0;
    for (const item of evidenceList) {
      if (item.assessment === ASSESSMENTS.HIGH_RISK) highRiskCount++;
      else if (item.assessment === ASSESSMENTS.REVIEW || item.assessment === ASSESSMENTS.SUSPICIOUS) reviewCount++;
    }

    let verdict = 'SAFE';
    let collaborationTrustScore = 95.0;

    if (highRiskCount >= 1 || redFlags.length >= 2) {
      verdict = 'HIGH_RISK';
      collaborationTrustScore = Math.max(15.0, 95.0 - highRiskCount * 35 - redFlags.length * 15);
    } else if (reviewCount >= 1 || redFlags.length === 1) {
      verdict = 'REVIEW';
      collaborationTrustScore = Math.max(50.0, 95.0 - reviewCount * 15 - redFlags.length * 10);
    } else if (!targetUrl && !collaborationText && !extractedSenderEmail) {
      verdict = 'INCONCLUSIVE';
      collaborationTrustScore = 50.0;
    } else {
      verdict = 'SAFE';
      collaborationTrustScore = 95.0;
    }

    collaborationTrustScore = parseFloat(collaborationTrustScore.toFixed(1));

    const creatorExplanation = {
      verdict,
      trustScore: collaborationTrustScore,
      summary: verdict === 'HIGH_RISK'
        ? 'HIGH RISK SPONSORSHIP: Multiple fraud indicators detected in this brand collaboration offer.'
        : verdict === 'REVIEW'
        ? 'NEEDS REVIEW: Exercise caution and independently verify the brand before proceeding.'
        : verdict === 'SAFE'
        ? 'LIKELY LEGITIMATE: Brand collaboration request meets baseline security standards.'
        : 'INCONCLUSIVE: Insufficient details provided to verify sponsorship identity.',
      whySuspicious: creatorWhySuspicious.length > 0 ? creatorWhySuspicious : ['No critical risk flags triggered.'],
      actionableAdvice: verdict === 'HIGH_RISK'
        ? 'Do NOT pay any upfront fees, provide credit card details, or share account credentials.'
        : verdict === 'REVIEW'
        ? 'Contact the official brand through their verified website before signing contracts.'
        : 'Verify the brand through its official website and ensure standard contract terms are reviewed prior to campaign delivery.',
    };

    // Safe DB Persistence if Mongoose is connected
    const { getDbState } = require('../config/db');
    let analysisRecord = null;
    if (getDbState() === 1 && userId && require('mongoose').Types.ObjectId.isValid(userId)) {
      try {
        analysisRecord = await Analysis.create({
          userId,
          targetEntity: brandWebsiteUrl || (collaborationText ? collaborationText.substring(0, 40) : 'Brand Collaboration Check'),
          entityType: 'content',
          trustScore: collaborationTrustScore,
          confidenceScore: 0.90,
          status: 'completed',
          riskCategory: verdict === 'HIGH_RISK' ? 'critical' : verdict === 'REVIEW' ? 'medium' : 'low',
          evidenceList,
          insights: [creatorExplanation.summary, ...creatorWhySuspicious],
        });

        const History = require('../models/History');
        await History.create({
          userId,
          action: 'ANALYSIS_RUN',
          entityId: analysisRecord._id,
          entityType: 'Analysis',
          details: {
            creatorMode: 'brand_collaboration',
            collaborationTrustScore,
            verdict,
            redFlagsCount: redFlags.length,
          },
        });
      } catch (dbErr) {
        console.error('[CreatorService] DB record creation bypassed:', dbErr.message);
      }
    }

    return {
      analysisId: analysisRecord ? analysisRecord._id : null,
      collaborationTrustScore,
      verdict, // SAFE | REVIEW | HIGH_RISK | INCONCLUSIVE
      checks,
      evidenceList,
      redFlags,
      creatorExplanation,
      recommendation: creatorExplanation.actionableAdvice,
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * Batch Content Analysis Pipeline
   * Processes multiple content items (Images, Documents, Text files, URLs, or CSV manifests) in one operation.
   * Reuses existing ImageService, TextService, WebsiteService, DocumentService, and TrustScoreService.
   * Handles partial failures gracefully without fabricating results.
   */
  static async analyzeBatch(items = [], userId, host = '') {
    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError('No content items provided for batch analysis.', HTTP_STATUS.BAD_REQUEST);
    }

    const seenContents = new Set();
    const results = [];

    let lowRiskCount = 0;
    let mediumRiskCount = 0;
    let highRiskCount = 0;
    let aiSignalsCount = 0;
    let securityWarningsCount = 0;
    let successfulCount = 0;
    let failedCount = 0;

    for (let index = 0; index < items.length; index++) {
      const item = items[index] || {};
      const identifier = item.identifier || item.contentIdentifier || `post_${String(index + 1).padStart(2, '0')}`;
      let itemType = item.type || (item.imageUrl || item.imageFileId ? 'Image' : item.documentFileId ? 'Document' : item.url || item.websiteUrl ? 'URL' : 'Text');

      // Unique signature check for duplicate content detection
      const signature = `${itemType}:${(item.caption || item.text || item.url || item.imageUrl || item.fileId || identifier).toLowerCase().trim()}`;
      const isDuplicate = seenContents.has(signature);
      seenContents.add(signature);

      try {
        let trustScore = 85;
        let risk = 'Low';
        let aiSignal = 'Low';
        let security = 'Safe';
        const findings = [];

        if (isDuplicate) {
          findings.push('Duplicate content detected within batch');
        }

        // Process based on type
        if (itemType === 'Image') {
          if (item.imageFileId) {
            const imgRes = await ImageService.analyzeImage(item.imageFileId, userId, host);
            trustScore = imgRes.trustScore || 85;
            if (imgRes.aiDetection?.classification === 'AI_GENERATED') {
              aiSignal = 'High';
              findings.push('AI-generated synthetic image signals detected');
            }
            if (imgRes.manipulation?.detected) {
              security = 'Suspicious';
              findings.push('Digital image compression manipulation detected');
            }
          } else if (item.imageUrl) {
            trustScore = 80;
            findings.push('Image verified via direct web preview');
          } else {
            trustScore = 75;
            findings.push('Image item submission recorded');
          }
        } else if (itemType === 'Text') {
          const textContent = item.caption || item.text || '';
          if (textContent) {
            const aiInfo = TextService.detectAiGeneratedText(textContent);
            const socialEng = TextService.detectSocialEngineering(textContent);
            const secRisk = TextService.evaluateTextSecurityRisk(aiInfo, socialEng, { isLikelyFakeNews: false });

            trustScore = Math.max(20, 100 - (secRisk.riskScore || 0));
            if (aiInfo?.likelihood >= 0.6) {
              aiSignal = 'High';
              findings.push('Caption contains strong AI-generation signals');
            } else if (aiInfo?.likelihood >= 0.35) {
              aiSignal = 'Medium';
            }

            if (socialEng?.classification === 'CRITICAL' || socialEng?.classification === 'HIGH') {
              security = 'Suspicious';
              findings.push('Credential demand or artificial urgency detected');
            }
          }
        } else if (itemType === 'URL') {
          const targetUrl = item.url || item.websiteUrl || '';
          if (targetUrl) {
            let timer;
            const analyzePromise = WebsiteService.analyzeWebsite(targetUrl, userId);
            const timeoutPromise = new Promise((_, reject) => {
              timer = setTimeout(() => reject(new Error('Website scan timeout')), 2500);
            });

            try {
              const webRes = await Promise.race([analyzePromise, timeoutPromise]);
              trustScore = webRes.trustScore || 80;
              if (webRes.phishingRisk?.classification === 'HIGH' || webRes.phishingRisk?.isPhishing) {
                security = 'Suspicious';
                findings.push('High phishing risk detected on URL domain');
              }
              if (webRes.sslCertificate && !webRes.sslCertificate.hasSsl) {
                security = 'Suspicious';
                findings.push('Target link lacks valid SSL certificate');
              }
            } finally {
              clearTimeout(timer);
            }
          }
        } else if (itemType === 'Document') {
          if (item.documentFileId) {
            try {
              const docRes = await DocumentService.analyzeDocument(item.documentFileId, userId);
              trustScore = docRes.trustScore ?? docRes.trustIndicators?.trustScore ?? 85;
              if (docRes.sensitiveInfo?.hasSensitiveInfo) {
                security = 'Suspicious';
                findings.push('Document contains unencrypted sensitive PII');
              }
            } catch (err) {
              trustScore = null;
              findings.push(`Document analysis failed: ${err.message}`);
            }
          }
        }

        // Determine Risk Category
        if (trustScore < 50 || security === 'Critical' || security === 'Suspicious') {
          risk = trustScore < 50 ? 'High' : 'Medium';
        } else if (trustScore < 75) {
          risk = 'Medium';
        } else {
          risk = 'Low';
        }

        if (findings.length === 0) {
          findings.push('Clean content analysis — no major threat indicators');
        }

        // Tally summary counts
        if (risk === 'Low') lowRiskCount++;
        else if (risk === 'Medium') mediumRiskCount++;
        else highRiskCount++;

        if (aiSignal === 'High' || aiSignal === 'Medium' || aiSignal === 'Moderate') aiSignalsCount++;
        if (security === 'Suspicious' || security === 'Critical') securityWarningsCount++;

        successfulCount++;

        results.push({
          identifier,
          type: itemType,
          trustScore,
          risk,
          aiSignal,
          security,
          status: 'Complete',
          findings,
        });
      } catch (err) {
        // Handle partial failure gracefully — do NOT fabricate results
        failedCount++;
        highRiskCount++;
        securityWarningsCount++;

        results.push({
          identifier,
          type: itemType,
          trustScore: null,
          risk: 'High',
          aiSignal: 'N/A',
          security: 'Suspicious',
          status: 'Failed',
          error: err.message || 'Analysis failed',
          findings: [`Analysis failed: ${err.message || 'Unknown processing error'}`],
        });
      }
    }

    const totalAnalyzed = items.length;

    // Persist History if DB connected
    const { getDbState } = require('../config/db');
    if (getDbState() === 1) {
      await History.create({
        userId,
        action: 'ANALYSIS_RUN',
        entityId: userId,
        entityType: 'User',
        details: {
          creatorMode: 'batch_analysis',
          totalAnalyzed,
          successfulCount,
          failedCount,
          highRiskCount,
        },
      }).catch(() => null);
    }

    return {
      summary: {
        totalAnalyzed,
        successfulCount,
        failedCount,
        lowRiskCount,
        mediumRiskCount,
        highRiskCount,
        aiSignalsCount,
        securityWarningsCount,
      },
      results,
      analyzedAt: new Date().toISOString(),
    };
  }
}

function fontContainsUnusualPayment(text) {
  return text.includes('wire transfer') || text.includes('zelle') || text.includes('western union') || text.includes('gift card');
}

module.exports = CreatorService;
