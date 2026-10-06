const https = require('https');
const tls = require('tls');
const dns = require('dns').promises;
const URL = require('url').URL;
const Analysis = require('../models/Analysis');
const History = require('../models/History');
const AppError = require('../utils/appError');
const { HTTP_STATUS } = require('../constants');
const { EvidenceBuilder, EvidenceAggregator, CATEGORIES, ASSESSMENTS, SOURCES } = require('./evidence');

/**
 * Service Layer for Website Integrity, TLS Inspection, Domain Telemetry & Phishing Threat Intelligence
 * Enforces the core TrustGraph business rule: DETECTION !== DANGER.
 */
class WebsiteService {
  /**
   * High-risk TLD extensions frequently used in automated phishing and fraud campaigns.
   */
  static SUSPICIOUS_TLDS = new Set([
    '.xyz', '.top', '.phishing', '.tk', '.ru', '.cn', '.bit', '.work', '.click',
    '.zip', '.mov', '.fit', '.cfd', '.rest', '.icu', '.cc', '.buzz', '.space',
    '.monster', '.cf', '.gq', '.ml', '.ga'
  ]);

  /**
   * Evaluates SSL/TLS assessment structure.
   */
  static evaluateTlsAssessment(sslInfo) {
    if (!sslInfo || !sslInfo.hasSsl) {
      return { valid: false, score: 0 };
    }
    const valid = sslInfo.hasSsl && sslInfo.isAuthorized && !sslInfo.isExpired;
    let score = valid ? (sslInfo.daysRemaining >= 180 ? 95 : 85) : 30;
    return { valid, score };
  }

  /**
   * Analyzes phishing risk for a URL.
   */
  static analyzePhishingRisk(urlObj, sslInfo, dnsInfo) {
    let score = 0;
    const path = (urlObj.pathname || '').toLowerCase();
    const hostname = (urlObj.hostname || '').toLowerCase();

    const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
    if (isIp) score += 0.35;

    const keywords = ['paypal', 'login', 'verify', 'account', 'secure', 'bank', 'auth'];
    const count = keywords.filter((k) => path.includes(k) || hostname.includes(k)).length;

    if (isIp && count >= 2) {
      score += 0.40;
    } else if (count === 1 && path.includes('login') && !isIp) {
      score += 0.10;
    } else if (count > 1) {
      score += count * 0.15;
    }

    if (sslInfo && !sslInfo.hasSsl) score += 0.15;
    if (dnsInfo && !dnsInfo.hasMxRecords) score += 0.10;

    const likelihood = Math.min(1.0, score);
    return {
      isLikelyPhishing: likelihood >= 0.60,
      likelihood: parseFloat(likelihood.toFixed(2)),
    };
  }

  /**
   * 1. Inspects live SSL/TLS Certificate using Node's TLS module.
   */
  static inspectSslCertificate(hostname, port = 443) {
    return new Promise((resolve) => {
      const options = {
        host: hostname,
        port: port,
        servername: hostname,
        rejectUnauthorized: false,
      };

      const socket = tls.connect(options, () => {
        const cert = socket.getPeerCertificate(true);
        const isAuthorized = socket.authorized;
        socket.end();

        if (!cert || Object.keys(cert).length === 0) {
          return resolve({
            hasSsl: false,
            error: 'No SSL certificate served by target server.',
          });
        }

        const validFrom = new Date(cert.valid_from);
        const validTo = new Date(cert.valid_to);
        const now = new Date();
        const daysRemaining = Math.ceil((validTo - now) / (1000 * 60 * 60 * 24));
        const isExpired = now > validTo;

        resolve({
          hasSsl: true,
          isAuthorized,
          issuer: cert.issuer?.O || cert.issuer?.CN || 'Unknown Issuer',
          subject: cert.subject?.CN || hostname,
          validFrom: validFrom.toISOString(),
          validTo: validTo.toISOString(),
          daysRemaining,
          isExpired,
          serialNumber: cert.serialNumber,
          fingerprint: cert.fingerprint,
        });
      });

      socket.on('error', (err) => {
        resolve({
          hasSsl: false,
          error: `TLS Connection Error: ${err.message}`,
        });
      });

      socket.setTimeout(5000, () => {
        socket.destroy();
        resolve({
          hasSsl: false,
          error: 'TLS Connection Timeout (5000ms).',
        });
      });
    });
  }

  /**
   * 2. Performs DNS Lookup and WHOIS Telemetry.
   */
  static async inspectDnsAndDomain(hostname) {
    try {
      const addresses = await dns.resolve4(hostname).catch(() => []);
      const mxRecords = await dns.resolveMx(hostname).catch(() => []);
      const txtRecords = await dns.resolveTxt(hostname).catch(() => []);

      const hasMxRecords = mxRecords.length > 0;
      const hasSpfRecord = txtRecords.some((txt) => txt.join('').includes('v=spf1'));

      return {
        ipAddresses: addresses,
        primaryIp: addresses[0] || null,
        mxRecordsCount: mxRecords.length,
        hasMxRecords,
        hasSpfRecord,
        heuristicSecurityStatus: hasMxRecords ? 'CONFIGURED_MX' : 'NO_MX_RECORDS',
      };
    } catch (err) {
      return {
        ipAddresses: [],
        primaryIp: null,
        hasMxRecords: false,
        hasSpfRecord: false,
        heuristicSecurityStatus: 'DNS_UNRESOLVED',
        error: `DNS resolution failed: ${err.message}`,
      };
    }
  }

  /**
   * 3. Evaluates TLS / Certificate Evidence
   */
  static evaluateTlsEvidence(sslInfo) {
    const evidenceItems = [];

    if (!sslInfo.hasSsl) {
      evidenceItems.push(
        EvidenceBuilder.create({
          signal: 'WEBSITE_HTTPS_TLS',
          category: CATEGORIES.WEBSITE_SECURITY,
          assessment: ASSESSMENTS.HIGH_RISK,
          value: 0.0,
          confidence: 0.95,
          source: SOURCES.TLS,
          evidence: [sslInfo.error || 'Target web server does not support encrypted HTTPS connections.'],
          rawSignal: sslInfo,
        })
      );
    } else {
      if (sslInfo.isExpired) {
        evidenceItems.push(
          EvidenceBuilder.create({
            signal: 'WEBSITE_CERTIFICATE_ISSUES',
            category: CATEGORIES.WEBSITE_SECURITY,
            assessment: ASSESSMENTS.HIGH_RISK,
            value: 0.20,
            confidence: 0.95,
            source: SOURCES.TLS,
            evidence: ['SSL/TLS certificate has expired.'],
            rawSignal: { daysRemaining: sslInfo.daysRemaining, validTo: sslInfo.validTo },
          })
        );
      }
      if (!sslInfo.isAuthorized) {
        evidenceItems.push(
          EvidenceBuilder.create({
            signal: 'WEBSITE_CERTIFICATE_ISSUES',
            category: CATEGORIES.WEBSITE_SECURITY,
            assessment: ASSESSMENTS.SUSPICIOUS,
            value: 0.40,
            confidence: 0.90,
            source: SOURCES.TLS,
            evidence: ['SSL/TLS certificate chain authority could not be verified (Self-signed or untrusted CA).'],
            rawSignal: { issuer: sslInfo.issuer },
          })
        );
      }
      if (sslInfo.daysRemaining !== null && sslInfo.daysRemaining < 14 && !sslInfo.isExpired) {
        evidenceItems.push(
          EvidenceBuilder.create({
            signal: 'WEBSITE_DOMAIN_AGE',
            category: CATEGORIES.WEBSITE_SECURITY,
            assessment: ASSESSMENTS.REVIEW,
            value: 0.60,
            confidence: 0.85,
            source: SOURCES.METADATA,
            evidence: [`SSL/TLS certificate expires soon (${sslInfo.daysRemaining} days remaining).`],
            rawSignal: { daysRemaining: sslInfo.daysRemaining },
          })
        );
      }

      if (sslInfo.isAuthorized && !sslInfo.isExpired) {
        evidenceItems.push(
          EvidenceBuilder.create({
            signal: 'WEBSITE_HTTPS_TLS',
            category: CATEGORIES.WEBSITE_SECURITY,
            assessment: ASSESSMENTS.SAFE,
            value: 1.0,
            confidence: 0.95,
            source: SOURCES.TLS,
            evidence: [`Valid TLS certificate issued by trusted CA ("${sslInfo.issuer}").`],
            rawSignal: { issuer: sslInfo.issuer, validTo: sslInfo.validTo },
          })
        );
      }
    }

    return evidenceItems;
  }

  /**
   * 4. Evaluates Domain, DNS, TLD, and URL Structure Evidence
   */
  static evaluateDomainAndUrlEvidence(urlObj, dnsInfo) {
    const evidenceItems = [];
    const hostname = urlObj.hostname.toLowerCase();
    const fullUrl = urlObj.href.toLowerCase();

    const isRawIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || /^\[[a-fA-F0-9:]+\]$/.test(hostname);

    // 1. IP-based URL Signal
    if (isRawIp) {
      evidenceItems.push(
        EvidenceBuilder.create({
          signal: 'WEBSITE_IP_URL',
          category: CATEGORIES.WEBSITE_PHISHING,
          assessment: ASSESSMENTS.HIGH_RISK,
          value: 0.85,
          confidence: 0.95,
          source: SOURCES.URL,
          evidence: [`URL uses raw IP address ("${hostname}") instead of a registered domain name.`],
          rawSignal: { hostname, isRawIp: true },
        })
      );
    }

    // 2. Suspicious TLD Signal
    const lastDotIdx = hostname.lastIndexOf('.');
    const ext = lastDotIdx !== -1 ? hostname.substring(lastDotIdx) : '';
    if (this.SUSPICIOUS_TLDS.has(ext)) {
      evidenceItems.push(
        EvidenceBuilder.create({
          signal: 'WEBSITE_SUSPICIOUS_TLD',
          category: CATEGORIES.WEBSITE_PHISHING,
          assessment: ASSESSMENTS.HIGH_RISK,
          value: 0.75,
          confidence: 0.90,
          source: SOURCES.URL,
          evidence: [`Domain uses high-risk TLD extension ("${ext}") frequently associated with abuse.`],
          rawSignal: { hostname, tld: ext },
        })
      );
    }

    // 3. Suspicious URL Patterns (Ports, `@` character, homoglyphs, deep subdomains, credential paths)
    const urlPatternTriggers = [];
    if (urlObj.port && !['80', '443', ''].includes(urlObj.port)) {
      urlPatternTriggers.push(`Non-standard network port (:${urlObj.port})`);
    }
    if (fullUrl.includes('@')) {
      urlPatternTriggers.push('Embedded userinfo "@" character used to obfuscate true host destination');
    }
    if (hostname.startsWith('xn--')) {
      urlPatternTriggers.push(`Punycode homoglyph domain encoding ("${hostname}")`);
    }
    const subdomains = hostname.split('.');
    if (subdomains.length > 4) {
      urlPatternTriggers.push(`Excessive subdomain nesting depth (${subdomains.length} levels)`);
    }

    const authKeywords = ['login', 'signin', 'verify', 'password', 'secure-update', 'credential', 'otp'];
    const matchedAuthKw = authKeywords.find((kw) => fullUrl.includes(kw));
    if (matchedAuthKw && (isRawIp || this.SUSPICIOUS_TLDS.has(ext) || urlPatternTriggers.length > 0)) {
      urlPatternTriggers.push(`Credential harvesting path keyword ("${matchedAuthKw}")`);
    }

    if (urlPatternTriggers.length > 0) {
      evidenceItems.push(
        EvidenceBuilder.create({
          signal: 'WEBSITE_SUSPICIOUS_URL_PATTERN',
          category: CATEGORIES.WEBSITE_PHISHING,
          assessment: ASSESSMENTS.HIGH_RISK,
          value: 0.80,
          confidence: 0.88,
          source: SOURCES.URL,
          evidence: urlPatternTriggers,
          rawSignal: { urlPatternTriggers },
        })
      );
    }

    // 4. DNS Information Signal
    if (dnsInfo.error) {
      evidenceItems.push(
        EvidenceBuilder.create({
          signal: 'WEBSITE_DNS_INFO',
          category: CATEGORIES.WEBSITE_SECURITY,
          assessment: ASSESSMENTS.INCONCLUSIVE,
          value: 0.0,
          confidence: 0.90,
          source: SOURCES.DNS,
          evidence: [`DNS Resolution Failure: ${dnsInfo.error}`],
          rawSignal: dnsInfo,
        })
      );
    } else {
      if (!dnsInfo.hasMxRecords) {
        evidenceItems.push(
          EvidenceBuilder.create({
            signal: 'WEBSITE_DNS_INFO',
            category: CATEGORIES.WEBSITE_SECURITY,
            assessment: ASSESSMENTS.REVIEW,
            value: 0.50,
            confidence: 0.85,
            source: SOURCES.DNS,
            evidence: ['Domain lacks configured MX (Mail Exchange) server records.'],
            rawSignal: { hasMxRecords: false, hasSpfRecord: dnsInfo.hasSpfRecord },
          })
        );
      } else {
        evidenceItems.push(
          EvidenceBuilder.create({
            signal: 'WEBSITE_DNS_INFO',
            category: CATEGORIES.WEBSITE_SECURITY,
            assessment: ASSESSMENTS.SAFE,
            value: 1.0,
            confidence: 0.92,
            source: SOURCES.DNS,
            evidence: [`DNS resolved (${dnsInfo.ipAddresses.length} A records, ${dnsInfo.mxRecordsCount} MX mail servers).`],
            rawSignal: dnsInfo,
          })
        );
      }
    }

    return evidenceItems;
  }

  /**
   * 5. Master Multi-Signal Verdict Synthesis
   * Verdict Options: SAFE | REVIEW | HIGH_RISK | INCONCLUSIVE
   * Rule: Single weak signal DOES NOT mark website malicious.
   */
  static synthesizeVerdict(evidenceItems) {
    let hasDnsError = false;
    let highRiskCount = 0;
    let reviewCount = 0;
    let safeCount = 0;

    for (const item of evidenceItems) {
      if (item.assessment === ASSESSMENTS.INCONCLUSIVE) {
        hasDnsError = true;
      } else if (item.assessment === ASSESSMENTS.HIGH_RISK) {
        highRiskCount++;
      } else if (item.assessment === ASSESSMENTS.REVIEW || item.assessment === ASSESSMENTS.SUSPICIOUS) {
        reviewCount++;
      } else if (item.assessment === ASSESSMENTS.SAFE || item.assessment === ASSESSMENTS.PASS) {
        safeCount++;
      }
    }

    let verdict = 'SAFE';
    let trustScore = 95.0;

    if (hasDnsError && safeCount === 0) {
      verdict = 'INCONCLUSIVE';
      trustScore = 40.0;
    } else if (highRiskCount >= 2 || (highRiskCount >= 1 && reviewCount >= 1)) {
      verdict = 'HIGH_RISK';
      trustScore = Math.max(10.0, 95.0 - highRiskCount * 35 - reviewCount * 15);
    } else if (highRiskCount === 1 || reviewCount >= 1) {
      verdict = 'REVIEW';
      trustScore = Math.max(45.0, 95.0 - highRiskCount * 25 - reviewCount * 15);
    } else {
      verdict = 'SAFE';
      trustScore = 95.0;
    }

    return {
      verdict,
      trustScore: parseFloat(trustScore.toFixed(1)),
      riskCategory: verdict === 'HIGH_RISK' ? 'critical' : verdict === 'REVIEW' ? 'medium' : 'low',
    };
  }

  /**
   * Master Website Analysis Orchestration Pipeline.
   */
  static async analyzeWebsite(targetUrl, userId) {
    if (!targetUrl || typeof targetUrl !== 'string' || targetUrl.trim().length === 0) {
      throw new AppError('Invalid or empty URL string provided.', HTTP_STATUS.BAD_REQUEST);
    }

    let urlObj;
    try {
      urlObj = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
    } catch (err) {
      throw new AppError('Invalid URL format. Please supply a valid web address.', HTTP_STATUS.BAD_REQUEST);
    }

    const hostname = urlObj.hostname;
    if (!hostname || hostname.trim().length === 0) {
      throw new AppError('Invalid URL: Hostname component missing.', HTTP_STATUS.BAD_REQUEST);
    }

    // SSRF Security Check: Verify host is not loopback, private RFC 1918 subnet, or cloud metadata
    const SsrfValidator = require('../utils/ssrfValidator');
    const ssrfCheck = await SsrfValidator.validateHostname(hostname);
    if (!ssrfCheck.isSafe) {
      throw new AppError(`SSRF Security Violation: ${ssrfCheck.error}`, HTTP_STATUS.FORBIDDEN);
    }

    // 1. SSL/TLS Certificate Inspection
    const sslInfo = await this.inspectSslCertificate(hostname, urlObj.port || (urlObj.protocol === 'http:' ? 80 : 443));
    const tlsEvidence = this.evaluateTlsEvidence(sslInfo);

    // 2. DNS Telemetry Inspection
    const dnsInfo = await this.inspectDnsAndDomain(hostname);

    // 3. Domain & URL Structure Evidence Evaluation
    const domainUrlEvidence = this.evaluateDomainAndUrlEvidence(urlObj, dnsInfo);

    // Consolidate Structured Evidence Items
    const evidenceList = [...tlsEvidence, ...domainUrlEvidence];
    const { verdict, trustScore, riskCategory } = this.synthesizeVerdict(evidenceList);

    // Build Findings & Recommendations
    const riskFindings = evidenceList
      .filter((e) => e.assessment !== ASSESSMENTS.SAFE && e.assessment !== ASSESSMENTS.PASS)
      .map((e) => ({
        signal: e.signal,
        severity: e.assessment === ASSESSMENTS.HIGH_RISK ? 'high' : 'medium',
        evidence: e.evidence,
        confidence: e.confidence,
        source: e.source,
      }));

    const recommendations = [];
    if (verdict === 'HIGH_RISK') {
      recommendations.push('Do not enter passwords, credit card numbers, or personal credentials on this website.');
    } else if (verdict === 'REVIEW') {
      recommendations.push('Verify company registration and domain ownership before initiating business transactions.');
    } else {
      recommendations.push('Domain meets baseline TLS and DNS security standards.');
    }

    // Safe DB Persistence if Mongoose is connected
    const { getDbState } = require('../config/db');
    let analysisId = null;
    if (getDbState() === 1 && userId && require('mongoose').Types.ObjectId.isValid(userId)) {
      try {
        const analysisRecord = await Analysis.create({
          userId,
          targetEntity: hostname,
          entityType: 'domain',
          trustScore,
          confidenceScore: 0.92,
          status: 'completed',
          riskCategory,
          evidenceList,
          insights: [
            `Verdict: ${verdict} (Trust Score: ${trustScore}%).`,
            `Protocol: ${urlObj.protocol.toUpperCase()} | Primary IP: ${dnsInfo.primaryIp || 'N/A'}.`,
            sslInfo.hasSsl ? `TLS Active (${sslInfo.issuer}).` : 'TLS Inactive / Unencrypted HTTP.',
          ],
        });
        analysisId = analysisRecord._id;

        await History.create({
          userId,
          action: 'TRUST_SCORE_QUERY',
          entityId: analysisRecord._id,
          entityType: 'Analysis',
          details: { domain: hostname, trustScore, riskCategory, verdict },
        });
      } catch (dbErr) {
        console.error('[WebsiteService] DB record creation bypassed:', dbErr.message);
      }
    }

    return {
      analysisId,
      url: urlObj.href,
      domain: hostname,
      verdict, // SAFE | REVIEW | HIGH_RISK | INCONCLUSIVE
      overallTrustScore: trustScore,
      trustScore,
      riskCategory,
      evidenceList,
      riskFindings,
      recommendations,
      sslCertificate: sslInfo,
      domainTelemetry: dnsInfo,
    };
  }
}

module.exports = WebsiteService;
