const dns = require('dns').promises;
const net = require('net');
const { URL } = require('url');

/**
 * Server-Side Request Forgery (SSRF) Protection Validator
 * Blocks requests targeting loopback addresses, RFC 1918 private subnets, cloud metadata, and IPv6 link-local ranges.
 */
class SsrfValidator {
  static PRIVATE_IPV4_PATTERNS = [
    /^127\./,                          // 127.0.0.0/8 Loopback
    /^10\./,                           // 10.0.0.0/8 Private
    /^192\.168\./,                     // 192.168.0.0/16 Private
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // 172.16.0.0/12 Private
    /^169\.254\./,                     // 169.254.0.0/16 Link-local / AWS & GCP metadata
    /^0\./,                            // 0.0.0.0/8 Current network
    /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./, // 100.64.0.0/10 Carrier-grade NAT
    /^224\./,                          // Multicast
    /^240\./,                          // Reserved
  ];

  static BLOCKED_HOSTNAMES = new Set([
    'localhost',
    'localhost.localdomain',
    'metadata.google.internal',
    'metadata',
    'instance-data',
    '169.254.169.254',
  ]);

  /**
   * Checks if an IP string is an internal/private/loopback address.
   */
  static isPrivateIp(ip) {
    if (!ip) return true;
    const cleanIp = String(ip).trim().toLowerCase();

    // IPv6 checks
    if (
      cleanIp === '::1' ||
      cleanIp === '0:0:0:0:0:0:0:1' ||
      cleanIp === '::' ||
      cleanIp.startsWith('::ffff:127.') ||
      cleanIp.startsWith('::ffff:10.') ||
      cleanIp.startsWith('::ffff:192.168.') ||
      cleanIp.startsWith('fe80:') || // IPv6 Link-Local
      cleanIp.startsWith('fc00:') || // IPv6 Unique Local
      cleanIp.startsWith('fd00:')    // IPv6 Unique Local
    ) {
      return true;
    }

    // IPv4 regex checks
    for (const pattern of this.PRIVATE_IPV4_PATTERNS) {
      if (pattern.test(cleanIp)) return true;
    }

    return false;
  }

  /**
   * Validates a URL and its target host against SSRF protection policies.
   * Enforces http/https protocol and blocks internal networks.
   * @param {string} targetUrl
   * @returns {Promise<{ isSafe: boolean, urlObj?: URL, resolvedIps: string[], error?: string }>}
   */
  static async validateUrl(targetUrl) {
    let urlObj;
    try {
      urlObj = new URL(targetUrl);
    } catch (e) {
      return { isSafe: false, resolvedIps: [], error: 'Invalid URL string format.' };
    }

    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return {
        isSafe: false,
        resolvedIps: [],
        error: `Disallowed protocol "${urlObj.protocol}". Only HTTP and HTTPS outbound requests are permitted.`,
      };
    }

    const hostCheck = await this.validateHostname(urlObj.hostname);
    if (!hostCheck.isSafe) {
      return {
        isSafe: false,
        resolvedIps: hostCheck.resolvedIps,
        error: hostCheck.error,
      };
    }

    return {
      isSafe: true,
      urlObj,
      resolvedIps: hostCheck.resolvedIps,
    };
  }

  /**
   * Validates a hostname or direct IP string against SSRF rules by performing DNS resolution.
   * @param {string} hostname - Target hostname or IP string
   * @returns {Promise<{ isSafe: boolean, resolvedIps: string[], error?: string }>}
   */
  static async validateHostname(hostname) {
    const cleanHost = String(hostname).toLowerCase().trim();

    if (!cleanHost) {
      return { isSafe: false, resolvedIps: [], error: 'Empty hostname provided.' };
    }

    if (this.BLOCKED_HOSTNAMES.has(cleanHost)) {
      return { isSafe: false, resolvedIps: [], error: `Access to restricted host "${cleanHost}" is blocked for security.` };
    }

    // Direct IP address validation
    if (net.isIP(cleanHost)) {
      if (this.isPrivateIp(cleanHost)) {
        return { isSafe: false, resolvedIps: [cleanHost], error: `Target IP "${cleanHost}" is in a private/restricted network range.` };
      }
      return { isSafe: true, resolvedIps: [cleanHost] };
    }

    // Resolve DNS IPv4 & IPv6 records to verify all destination endpoints
    try {
      const addresses = await dns.resolve(cleanHost).catch(async () => {
        return await dns.resolve4(cleanHost);
      });

      if (!addresses || addresses.length === 0) {
        return { isSafe: false, resolvedIps: [], error: `DNS resolution returned zero addresses for host "${cleanHost}".` };
      }

      for (const ip of addresses) {
        if (this.isPrivateIp(ip)) {
          return {
            isSafe: false,
            resolvedIps: addresses,
            error: `Resolved IP address "${ip}" for host "${cleanHost}" belongs to a private/restricted network range.`,
          };
        }
      }

      return { isSafe: true, resolvedIps: addresses };
    } catch (err) {
      return { isSafe: false, resolvedIps: [], error: `DNS resolution error: ${err.message}` };
    }
  }

  /**
   * Validates a redirect location header against SSRF before following.
   * @param {string} originalUrl
   * @param {string} redirectLocation
   */
  static async validateRedirect(originalUrl, redirectLocation) {
    try {
      const resolvedRedirect = new URL(redirectLocation, originalUrl).href;
      return await this.validateUrl(resolvedRedirect);
    } catch (err) {
      return { isSafe: false, resolvedIps: [], error: `Redirect URL validation failed: ${err.message}` };
    }
  }
}

module.exports = SsrfValidator;
