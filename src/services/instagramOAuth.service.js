/**
 * Instagram OAuth Service
 *
 * Implements official Meta/Instagram Graph API integration:
 *   - OAuth 2.0 authorization code flow (server-side only)
 *   - Short-lived → long-lived token exchange
 *   - AES-256-GCM encrypted token storage via InstagramConnection model
 *   - Media retrieval via Instagram Graph API v19.0
 *   - Token expiry detection and graceful disconnect
 *   - Audit logging (never logs raw tokens)
 *
 * IMPORTANT LIMITATIONS documented in INSTAGRAM_INTEGRATION.md:
 *   - Requires a Meta Developer App with Instagram Graph API product added
 *   - Only works with Instagram Professional accounts (Business or Creator)
 *   - Requires App Review for Advanced Access beyond test users
 *   - instagram_business_basic scope is the minimum required permission
 */

const https = require('https');
const querystring = require('querystring');
const crypto = require('crypto');
const URL = require('url').URL;
const { getDbState } = require('../config/db');

// ──────────────────────────────────────────────
// Meta & Instagram API Constants
// ──────────────────────────────────────────────
const META_GRAPH_API_VERSION = process.env.INSTAGRAM_API_VERSION || 'v19.0';
const INSTAGRAM_AUTH_URL = process.env.INSTAGRAM_AUTH_URL || 'https://www.instagram.com/oauth/authorize';
const META_OAUTH_DIALOG_URL = `https://www.facebook.com/${META_GRAPH_API_VERSION}/dialog/oauth`;
const META_TOKEN_URL = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/oauth/access_token`;
const INSTAGRAM_TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
const GRAPH_API_BASE = `https://graph.instagram.com/${META_GRAPH_API_VERSION}`;
const FB_GRAPH_API_BASE = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;

// Scopes matching official Meta Instagram Business Login configuration:
const REQUIRED_SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_messages',
  'instagram_business_manage_comments',
  'instagram_business_content_publish',
  'instagram_business_manage_insights',
].join(',');

// How many days before expiry we consider a token "stale" and prompt re-auth
const TOKEN_WARN_DAYS = 7;

// ──────────────────────────────────────────────
// Utility: generic HTTPS GET with JSON response
// ──────────────────────────────────────────────
function httpsGet(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('Request timed out')); });
  });
}

// ──────────────────────────────────────────────
// Utility: generic HTTPS POST with form data
// ──────────────────────────────────────────────
function httpsPost(url, formData, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const body = querystring.stringify(formData);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (c) => (responseBody += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
        } catch {
          resolve({ status: res.statusCode, data: responseBody });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('Request timed out')); });
    req.write(body);
    req.end();
  });
}

// ──────────────────────────────────────────────
// Check if the Meta app credentials are configured
// ──────────────────────────────────────────────
function getAppId() {
  return process.env.INSTAGRAM_APP_ID || process.env.META_APP_ID || process.env.FACEBOOK_APP_ID || '';
}

function getAppSecret() {
  return process.env.INSTAGRAM_APP_SECRET || process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET || '';
}

function getRedirectUri() {
  return process.env.INSTAGRAM_REDIRECT_URI || '';
}

function getEffectiveRedirectUri() {
  return process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:5000/api/v1/instagram/oauth/callback';
}

function getScopes() {
  return process.env.INSTAGRAM_SCOPES || REQUIRED_SCOPES;
}

function isInstagramConfigured() {
  return !!(getAppId() && getAppSecret() && getRedirectUri());
}

// ──────────────────────────────────────────────
// Main service class
// ──────────────────────────────────────────────
class InstagramOAuthService {
  /**
   * Returns the configuration status of the Instagram integration.
   */
  static getConfigStatus() {
    return {
      configured: isInstagramConfigured(),
      appIdSet: !!getAppId(),
      appSecretSet: !!getAppSecret(),
      redirectUriSet: !!getRedirectUri(),
      graphApiVersion: META_GRAPH_API_VERSION,
      requiredScopes: getScopes().split(','),
      authUrl: process.env.INSTAGRAM_AUTH_URL || INSTAGRAM_AUTH_URL,
      redirectUri: getRedirectUri(),
    };
  }

  /**
   * Generates an Instagram OAuth authorization URL with a CSRF state token.
   * The state token is stored in the session/DB so the callback can verify it.
   *
   * @param {string} userId — TrustGraph user ID (used as part of the state)
   * @returns {{ url: string, state: string }}
   */
  static generateAuthUrl(userId) {
    if (!isInstagramConfigured()) {
      throw new Error('Instagram app credentials are not configured. See INSTAGRAM_INTEGRATION.md.');
    }

    // CSRF state: random bytes bound to the user ID
    const state = crypto.randomBytes(24).toString('hex') + '_' + userId;
    const authEndpoint = process.env.INSTAGRAM_AUTH_URL || INSTAGRAM_AUTH_URL;

    const params = new URLSearchParams({
      force_reauth: 'true',
      client_id: getAppId(),
      redirect_uri: getEffectiveRedirectUri(),
      response_type: 'code',
      scope: getScopes(),
      state,
    });

    if (process.env.INSTAGRAM_CONFIG_ID) {
      params.append('config_id', process.env.INSTAGRAM_CONFIG_ID);
    }

    return {
      url: `${authEndpoint}?${params.toString()}`,
      state,
    };
  }

  /**
   * Validates the state parameter returned in the OAuth callback to prevent CSRF.
   * @param {string} returnedState
   * @param {string} storedState
   * @param {string} userId
   */
  static validateOAuthState(returnedState, storedState, userId) {
    if (!returnedState || !storedState) return false;
    if (returnedState !== storedState) return false;
    // State must end with the userId we generated it for
    const parts = storedState.split('_');
    const stateUserId = parts[parts.length - 1];
    return stateUserId === String(userId);
  }

  /**
   * Exchanges the authorization code for a short-lived token,
   * then immediately exchanges for a long-lived token (60 days).
   * Supports both Meta Facebook Login Dialog and Instagram Business Login flows.
   *
   * @param {string} code — authorization code from callback query param
   * @returns {{ accessToken: string, tokenType: string, expiresIn: number, instagramUserId: string }}
   */
  static async exchangeCodeForToken(code) {
    if (!isInstagramConfigured()) {
      throw new Error('Instagram app credentials are not configured.');
    }

    let tokenData = null;

    // Step 1: Code → short-lived token via api.instagram.com (Instagram Login flow)
    try {
      const shortLivedRes = await httpsPost(INSTAGRAM_TOKEN_URL, {
        client_id: getAppId(),
        client_secret: getAppSecret(),
        grant_type: 'authorization_code',
        redirect_uri: getEffectiveRedirectUri(),
        code,
      });

      if (shortLivedRes.status === 200 && shortLivedRes.data.access_token) {
        tokenData = {
          shortLivedToken: shortLivedRes.data.access_token,
          expiresIn: shortLivedRes.data.expires_in || 3600,
          tokenType: shortLivedRes.data.token_type || 'bearer',
          instagramUserId: String(shortLivedRes.data.user_id || ''),
          isFbFlow: false,
        };
      }
    } catch {
      // Fall through to Meta Graph fallback
    }

    // Fallback: Meta Facebook OAuth token exchange
    if (!tokenData) {
      try {
        const fbUrl = `${META_TOKEN_URL}?client_id=${encodeURIComponent(getAppId())}&client_secret=${encodeURIComponent(getAppSecret())}&redirect_uri=${encodeURIComponent(getEffectiveRedirectUri())}&code=${encodeURIComponent(code)}`;
        const fbRes = await httpsGet(fbUrl);

        if (fbRes.status === 200 && fbRes.data.access_token) {
          tokenData = {
            shortLivedToken: fbRes.data.access_token,
            expiresIn: fbRes.data.expires_in || 3600,
            tokenType: fbRes.data.token_type || 'bearer',
            isFbFlow: true,
          };
        } else {
          const errMsg = fbRes.data?.error?.message || fbRes.data?.error_message || 'Token exchange failed';
          throw new Error(`Instagram token exchange failed: ${errMsg}`);
        }
      } catch (err) {
        throw new Error(`Instagram token exchange failed: ${err.message}`);
      }
    }

    // Step 2: Short-lived → long-lived (60-day) token
    let longLivedToken = tokenData.shortLivedToken;
    let longLivedExpiresIn = 60 * 24 * 60 * 60; // default 60 days in seconds

    try {
      const longLivedUrl = tokenData.isFbFlow
        ? `https://graph.facebook.com/${META_GRAPH_API_VERSION}/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(getAppId())}&client_secret=${encodeURIComponent(getAppSecret())}&fb_exchange_token=${encodeURIComponent(tokenData.shortLivedToken)}`
        : `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(getAppSecret())}&access_token=${encodeURIComponent(tokenData.shortLivedToken)}`;

      const longLivedRes = await httpsGet(longLivedUrl);
      if (longLivedRes.status === 200 && longLivedRes.data.access_token) {
        longLivedToken = longLivedRes.data.access_token;
        longLivedExpiresIn = longLivedRes.data.expires_in || longLivedExpiresIn;
      }
    } catch {
      // Use short lived token if exchange fails
    }

    // Step 3: Resolve Instagram Professional Account User ID if FB flow
    let igUserId = tokenData.instagramUserId;
    if (!igUserId && tokenData.isFbFlow) {
      try {
        const meAccountsUrl = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/me/accounts?access_token=${encodeURIComponent(longLivedToken)}`;
        const pagesRes = await httpsGet(meAccountsUrl);
        const pages = pagesRes.data?.data || [];
        for (const page of pages) {
          const pageDetailUrl = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${page.id}?fields=instagram_business_account,name&access_token=${encodeURIComponent(longLivedToken)}`;
          const pageRes = await httpsGet(pageDetailUrl);
          if (pageRes.data?.instagram_business_account?.id) {
            igUserId = pageRes.data.instagram_business_account.id;
            break;
          }
        }
      } catch {
        // Non-fatal
      }
    }

    return {
      accessToken: longLivedToken,
      tokenType: tokenData.tokenType || 'bearer',
      expiresIn: longLivedExpiresIn,
      instagramUserId: String(igUserId || 'ig_prof_user'),
    };
  }

  /**
   * Saves or updates the user's Instagram connection in the database.
   * The access token is encrypted before storage.
   * NEVER logs the raw access token.
   *
   * @param {string} trustGraphUserId
   * @param {{ accessToken, expiresIn, instagramUserId }} tokenData
   * @returns {object} Public-safe connection object
   */
  static async saveConnection(trustGraphUserId, tokenData) {
    if (getDbState() !== 1) {
      throw new Error('Database not connected — cannot save Instagram connection');
    }

    const InstagramConnection = require('../models/InstagramConnection');
    const History = require('../models/History');

    // Fetch profile info using the new token
    let profileInfo = { username: '', name: '' };
    try {
      profileInfo = await this.fetchUserProfile(tokenData.accessToken, tokenData.instagramUserId);
    } catch {
      // Non-fatal — connection still created
    }

    const expiresAt = new Date(Date.now() + tokenData.expiresIn * 1000);

    // Upsert: one connection per TrustGraph user
    let connection = await InstagramConnection.findOne({ userId: trustGraphUserId });
    if (!connection) {
      connection = new InstagramConnection({ userId: trustGraphUserId, instagramUserId: tokenData.instagramUserId });
    }

    connection.instagramUserId = tokenData.instagramUserId;
    connection.username = profileInfo.username || connection.username || 'creator';
    connection.name = profileInfo.name || connection.name || 'Instagram Creator';
    connection.setAccessToken(tokenData.accessToken); // encrypts internally
    connection.tokenExpiresAt = expiresAt;
    connection.isActive = true;
    connection.grantedScopes = REQUIRED_SCOPES.split(',');
    await connection.save();

    // Audit log (no tokens logged)
    await History.create({
      userId: trustGraphUserId,
      action: 'SETTINGS_CHANGE',
      entityId: trustGraphUserId,
      entityType: 'User',
      details: {
        message: 'Instagram account connected',
        instagramUserId: tokenData.instagramUserId,
        username: profileInfo.username,
        tokenExpiresAt: expiresAt,
      },
    });

    return connection.toPublicObject();
  }

  /**
   * Fetches basic Instagram profile (username, name) using the Graph API.
   * @param {string} accessToken
   * @param {string} instagramUserId
   */
  static async fetchUserProfile(accessToken, instagramUserId) {
    let url = `${GRAPH_API_BASE}/${instagramUserId}?fields=id,username,name&access_token=${encodeURIComponent(accessToken)}`;
    let res = await httpsGet(url);

    if (res.status !== 200 || res.data.error) {
      // Fallback query graph.instagram.com if graph.facebook.com returned error
      url = `https://graph.instagram.com/${META_GRAPH_API_VERSION}/${instagramUserId}?fields=id,username,name&access_token=${encodeURIComponent(accessToken)}`;
      res = await httpsGet(url);
    }

    if (res.status !== 200 || res.data.error) {
      return { username: 'creator', name: 'Instagram Creator' };
    }

    return {
      username: res.data.username || 'creator',
      name: res.data.name || res.data.username || 'Instagram Creator',
    };
  }

  /**
   * Retrieves the user's Instagram media list from the Graph API.
   * Returns a limited set of fields (no private data beyond what user approved).
   *
   * @param {string} trustGraphUserId
   * @param {{ limit: number }} options
   */
  static async getUserMedia(trustGraphUserId, { limit = 10 } = {}) {
    if (getDbState() !== 1) {
      throw new Error('Database not connected');
    }

    const InstagramConnection = require('../models/InstagramConnection');
    const connection = await InstagramConnection.findOne({
      userId: trustGraphUserId,
      isActive: true,
    }).select('+encryptedAccessToken');

    if (!connection) {
      throw new Error('No active Instagram connection found. Please connect your account first.');
    }

    if (!connection.isTokenValid) {
      throw new Error('Instagram access token has expired. Please reconnect your account.');
    }

    const accessToken = connection.getAccessToken();
    if (!accessToken) {
      throw new Error('Failed to decrypt access token. Please reconnect your account.');
    }

    const fields = 'id,caption,media_type,media_url,thumbnail_url,timestamp,permalink';
    let url =
      `${GRAPH_API_BASE}/${connection.instagramUserId}/media` +
      `?fields=${fields}` +
      `&limit=${Math.min(limit, 50)}` +
      `&access_token=${encodeURIComponent(accessToken)}`;

    let res = await httpsGet(url);

    if (res.status !== 200 || res.data.error) {
      // Fallback query graph.instagram.com
      url =
        `https://graph.instagram.com/${META_GRAPH_API_VERSION}/${connection.instagramUserId}/media` +
        `?fields=${fields}` +
        `&limit=${Math.min(limit, 50)}` +
        `&access_token=${encodeURIComponent(accessToken)}`;
      res = await httpsGet(url);
    }

    if (res.status !== 200 || res.data.error) {
      const errMsg = res.data?.error?.message || 'Failed to fetch Instagram media';
      if (res.data?.error?.code === 190) {
        await InstagramConnection.updateOne({ userId: trustGraphUserId }, { isActive: false });
        throw new Error('Instagram access token is no longer valid. Please reconnect your account.');
      }
      throw new Error(errMsg);
    }

    // Update lastFetchedAt
    await InstagramConnection.updateOne({ userId: trustGraphUserId }, { lastFetchedAt: new Date() });

    const media = (res.data.data || []).map((item) => ({
      id: item.id,
      mediaType: item.media_type,
      caption: item.caption || '',
      mediaUrl: item.media_url || item.thumbnail_url || null,
      timestamp: item.timestamp,
      permalink: item.permalink,
      externalLinks: this._extractLinks(item.caption || ''),
    }));

    return {
      media,
      count: media.length,
      instagramUserId: connection.instagramUserId,
      username: connection.username,
      fetchedAt: new Date().toISOString(),
    };
  }

  /**
   * Fetches a single Instagram media item by its Media ID.
   * @param {string} mediaId
   * @param {string} trustGraphUserId
   */
  static async getMediaById(mediaId, trustGraphUserId) {
    if (getDbState() !== 1) throw new Error('Database not connected');

    const InstagramConnection = require('../models/InstagramConnection');
    const connection = await InstagramConnection.findOne({
      userId: trustGraphUserId,
      isActive: true,
    }).select('+encryptedAccessToken');

    if (!connection || !connection.isTokenValid) {
      throw new Error('No valid Instagram connection found. Please reconnect your account.');
    }

    const accessToken = connection.getAccessToken();
    const fields = 'id,caption,media_type,media_url,thumbnail_url,timestamp,permalink';
    const url =
      `${GRAPH_API_BASE}/${mediaId}` +
      `?fields=${fields}` +
      `&access_token=${encodeURIComponent(accessToken)}`;

    const res = await httpsGet(url);

    if (res.status !== 200 || res.data.error) {
      throw new Error(res.data?.error?.message || 'Failed to fetch media item');
    }

    return {
      id: res.data.id,
      mediaType: res.data.media_type,
      caption: res.data.caption || '',
      mediaUrl: res.data.media_url || res.data.thumbnail_url || null,
      timestamp: res.data.timestamp,
      permalink: res.data.permalink,
      externalLinks: this._extractLinks(res.data.caption || ''),
    };
  }

  /**
   * Returns the user's current connection status (safe, no tokens).
   * @param {string} trustGraphUserId
   */
  static async getConnectionStatus(trustGraphUserId) {
    if (getDbState() !== 1) {
      return { connected: false, reason: 'Database unavailable' };
    }

    const InstagramConnection = require('../models/InstagramConnection');
    const connection = await InstagramConnection.findOne({ userId: trustGraphUserId });

    if (!connection) return { connected: false };

    const daysUntilExpiry = connection.tokenExpiresAt
      ? Math.floor((connection.tokenExpiresAt - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      connected: connection.isActive && connection.isTokenValid,
      ...connection.toPublicObject(),
      daysUntilExpiry,
      tokenWarning: daysUntilExpiry !== null && daysUntilExpiry <= TOKEN_WARN_DAYS,
    };
  }

  /**
   * Revokes (disconnects) the user's Instagram connection.
   * Deletes the encrypted token; does NOT call Meta's revoke endpoint
   * since that is optional and may fail on their side.
   * @param {string} trustGraphUserId
   */
  static async disconnect(trustGraphUserId) {
    if (getDbState() !== 1) throw new Error('Database not connected');

    const InstagramConnection = require('../models/InstagramConnection');
    const History = require('../models/History');

    const connection = await InstagramConnection.findOne({ userId: trustGraphUserId });
    if (!connection) throw new Error('No Instagram connection found');

    const username = connection.username;
    await InstagramConnection.deleteOne({ userId: trustGraphUserId });

    await History.create({
      userId: trustGraphUserId,
      action: 'SETTINGS_CHANGE',
      entityId: trustGraphUserId,
      entityType: 'User',
      details: { message: 'Instagram account disconnected', username },
    });

    return { message: 'Instagram account disconnected successfully.' };
  }

  /**
   * Extracts external links from a caption/text string.
   * @param {string} text
   * @returns {string[]}
   */
  static _extractLinks(text) {
    if (!text) return [];
    const matches = text.match(/https?:\/\/[^\s]+/g) || [];
    return [...new Set(matches)];
  }
}

module.exports = InstagramOAuthService;
