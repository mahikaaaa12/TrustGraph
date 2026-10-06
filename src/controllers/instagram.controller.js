/**
 * Instagram OAuth Controller
 *
 * Handles Instagram OAuth 2.0 flow and content management endpoints.
 * Access tokens are NEVER returned to the frontend.
 * OAuth state is stored server-side in a per-user in-memory map (production
 * should use Redis or DB-backed sessions — see INSTAGRAM_INTEGRATION.md).
 */

const InstagramOAuthService = require('../services/instagramOAuth.service');
const CreatorService = require('../services/creator.service');
const { HTTP_STATUS } = require('../constants');

/**
 * Server-side CSRF state store (in-memory).
 * Maps userId → { state, createdAt }
 * Entries expire after 10 minutes.
 *
 * NOTE: In a multi-instance production deployment, replace with Redis.
 */
const oauthStateStore = new Map();
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function storeOAuthState(userId, state) {
  oauthStateStore.set(String(userId), { state, createdAt: Date.now() });
}

function retrieveAndClearOAuthState(userId) {
  const entry = oauthStateStore.get(String(userId));
  oauthStateStore.delete(String(userId));
  if (!entry) return null;
  if (Date.now() - entry.createdAt > STATE_TTL_MS) return null;
  return entry.state;
}

// Cleanup stale states every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [userId, entry] of oauthStateStore.entries()) {
    if (now - entry.createdAt > STATE_TTL_MS) oauthStateStore.delete(userId);
  }
}, 5 * 60 * 1000).unref();

// ──────────────────────────────────────────────────────────────────────
// GET /instagram/config
// Returns the integration configuration status (no secrets exposed).
// ──────────────────────────────────────────────────────────────────────
exports.getConfigStatus = (req, res) => {
  const status = InstagramOAuthService.getConfigStatus();
  res.status(HTTP_STATUS.OK).json({ success: true, data: status });
};

// ──────────────────────────────────────────────────────────────────────
// GET /instagram/oauth/connect
// Initiates the OAuth flow by generating the Meta authorization URL.
// Returns JSON with authorizationUrl when called via API, or performs 302 redirect.
// ──────────────────────────────────────────────────────────────────────
exports.initiateOAuth = (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`[Instagram OAuth] Connect request received for authenticated user: ${userId}`);

    const { url, state } = InstagramOAuthService.generateAuthUrl(userId);
    storeOAuthState(userId, state);
    console.log(`[Instagram OAuth] OAuth state generated and cached for user: ${userId}`);

    // If client requested JSON response (Axios/API request with Authorization header)
    if (req.headers.accept?.includes('application/json') || req.xhr || req.query.format === 'json') {
      console.log(`[Instagram OAuth] Returning OAuth authorization URL JSON payload to client`);
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          url,
          authorizationUrl: url,
          state,
        },
      });
    }

    // Direct browser navigation -> perform HTTP 302 Redirect
    console.log(`[Instagram OAuth] Redirecting browser to Meta OAuth authorization page`);
    res.redirect(url);
  } catch (err) {
    console.error(`[Instagram OAuth] Connect error: ${err.message}`);
    if (err.message.includes('not configured')) {
      return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
        success: false,
        message: 'Instagram integration is not configured on this server.',
        configRequired: true,
        docLink: '/api/v1/instagram/config',
      });
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: err.message });
  }
};

console.log('[INSTAGRAM_DEPLOY_CHECK] Instagram OAuth controller loaded');
console.log('[INSTAGRAM_DEPLOY_CHECK] callback handler version: v2.5-callback-tracer-0765c8');

// ──────────────────────────────────────────────────────────────────────
// GET /instagram/oauth/callback
// Instagram redirects here after the user authorizes (or denies) the app.
// This endpoint is PUBLIC (no JWT auth) so Meta can redirect to it.
// ──────────────────────────────────────────────────────────────────────
exports.oauthCallback = async (req, res) => {
  console.log('[INSTAGRAM_OAUTH] CURRENT_CALLBACK_HANDLER_REACHED');
  const { code, state, error, error_reason } = req.query;

  let clientUrl = process.env.CLIENT_URL || process.env.CLIENT_ORIGIN || 'https://trustgraph-client.onrender.com';
  if (clientUrl.includes('trustgraph-zx3q.onrender.com')) {
    console.warn(`[Instagram OAuth] CLIENT_URL environment variable points to backend URL (${clientUrl}). Overriding redirect target to frontend URL: https://trustgraph-client.onrender.com`);
    clientUrl = 'https://trustgraph-client.onrender.com';
  }

  console.log(`[Instagram OAuth] Callback endpoint hit by Meta redirect. Query params: code=${code ? '[PRESENT]' : 'absent'}, state=${state ? '[PRESENT]' : 'absent'}, error=${error || 'none'}`);
  console.log(`[Instagram OAuth] Client redirect base URL: ${clientUrl}`);

  // ── User denied authorization ──────────────────────────────────────
  if (error) {
    console.log(`[Instagram OAuth] Authorization denied by user or Meta: ${error_reason || error}`);
    return res.redirect(
      `${clientUrl}/dashboard/instagram?connected=false&error=${encodeURIComponent(error_reason || error)}`
    );
  }

  if (!code || !state) {
    console.error(`[Instagram OAuth] Callback missing required code or state parameter`);
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Missing authorization code or state parameter.',
    });
  }

  // ── Extract userId from state (state = randomHex_userId) ───────────
  const parts = state.split('_');
  const userId = parts.slice(1).join('_');

  // ── CSRF state validation ──────────────────────────────────────────
  const storedState = retrieveAndClearOAuthState(userId);
  if (!InstagramOAuthService.validateOAuthState(state, storedState, userId)) {
    console.error(`[Instagram OAuth] CSRF state validation failed for user: ${userId}`);
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'OAuth state validation failed. This request may have been tampered with or expired.',
    });
  }

  try {
    console.log(`[Instagram OAuth] CSRF state verified for user ${userId}. Exchanging authorization code for token...`);
    // ── Token exchange ───────────────────────────────────────────────
    const tokenData = await InstagramOAuthService.exchangeCodeForToken(code);

    console.log(`[Instagram OAuth] Token exchange successful. Saving encrypted connection for user ${userId}...`);
    // ── Persist encrypted token ──────────────────────────────────────
    await InstagramOAuthService.saveConnection(userId, tokenData);

    console.log(`[Instagram OAuth] Connection saved successfully. Redirecting user to ${clientUrl}/dashboard/instagram?connected=true`);
    // ── Redirect to frontend with success flag ───────────────────────
    res.redirect(`${clientUrl}/dashboard/instagram?connected=true`);
  } catch (err) {
    console.error(`[Instagram OAuth] Callback processing error: ${err.message}`);
    res.redirect(
      `${clientUrl}/dashboard/instagram?connected=false&error=${encodeURIComponent(err.message)}`
    );
  }
};

// ──────────────────────────────────────────────────────────────────────
// GET /instagram/status
// Returns the user's current connection status (safe — no tokens).
// ──────────────────────────────────────────────────────────────────────
exports.getConnectionStatus = async (req, res) => {
  try {
    const status = await InstagramOAuthService.getConnectionStatus(req.user.id);
    res.status(HTTP_STATUS.OK).json({ success: true, data: status });
  } catch (err) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: err.message });
  }
};

// ──────────────────────────────────────────────────────────────────────
// GET /instagram/media
// Fetches the user's recent Instagram media via the Graph API.
// ──────────────────────────────────────────────────────────────────────
exports.getUserMedia = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const mediaData = await InstagramOAuthService.getUserMedia(req.user.id, { limit });
    res.status(HTTP_STATUS.OK).json({ success: true, data: mediaData });
  } catch (err) {
    const isTokenError =
      err.message.includes('expired') ||
      err.message.includes('reconnect') ||
      err.message.includes('No active Instagram connection');
    res.status(isTokenError ? HTTP_STATUS.UNAUTHORIZED : HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message,
      requiresReconnect: isTokenError,
    });
  }
};

// ──────────────────────────────────────────────────────────────────────
// POST /instagram/analyze
// Analyzes a selected Instagram media item (or a manually provided package)
// through the existing TrustGraph engines via CreatorService.
// ──────────────────────────────────────────────────────────────────────
exports.analyzeInstagramContent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { mediaId, caption, externalLink, mediaUrl, mediaType, source } = req.body;

    let contentPackage;

    // ── Live API mode: fetch content from Graph API ──────────────────
    if (mediaId && source !== 'manual') {
      const mediaItem = await InstagramOAuthService.getMediaById(mediaId, userId);
      contentPackage = {
        caption: mediaItem.caption || caption || '',
        externalLink: mediaItem.externalLinks[0] || externalLink || '',
        imageUrl: mediaItem.mediaUrl,
        metadata: {
          source: 'instagram_graph_api',
          mediaType: mediaItem.mediaType,
          timestamp: mediaItem.timestamp,
          permalink: mediaItem.permalink,
          mediaId: mediaItem.id,
        },
      };
    } else {
      // ── Manual/demo mode ─────────────────────────────────────────
      contentPackage = {
        caption: caption || '',
        externalLink: externalLink || '',
        imageUrl: mediaUrl || '',
        metadata: {
          source: source || 'manual_import',
          mediaType: mediaType || 'IMAGE',
          note: 'Content provided manually — not fetched from Instagram API',
        },
      };
    }

    // ── Run through CreatorService (reuses existing analysis engines) ─
    const analysisResult = await CreatorService.analyzeContentPackage(
      {
        caption: contentPackage.caption,
        externalLink: contentPackage.externalLink,
        imageUrl: contentPackage.imageUrl,
        instagramMetadata: contentPackage.metadata,
      },
      userId,
      req.headers.host
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        ...analysisResult,
        instagramSource: contentPackage.metadata,
      },
    });
  } catch (err) {
    const isTokenError =
      err.message.includes('expired') ||
      err.message.includes('reconnect') ||
      err.message.includes('No valid Instagram connection');
    res.status(isTokenError ? HTTP_STATUS.UNAUTHORIZED : HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message,
      requiresReconnect: isTokenError,
    });
  }
};

// ──────────────────────────────────────────────────────────────────────
// DELETE /instagram/disconnect
// Revokes the user's Instagram connection and deletes the stored token.
// ──────────────────────────────────────────────────────────────────────
exports.disconnect = async (req, res) => {
  try {
    const result = await InstagramOAuthService.disconnect(req.user.id);
    res.status(HTTP_STATUS.OK).json({ success: true, data: result });
  } catch (err) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: err.message });
  }
};
