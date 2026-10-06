# Instagram Content Analyzer — Integration Documentation

> **TrustGraph × Meta Instagram Graph API**
> Last updated: October 2026

---

## Overview

TrustGraph's Instagram Content Analyzer allows Instagram Professional account holders to connect their account and verify their content through TrustGraph's existing analysis engines before publishing.

This feature uses **only** the official Meta Instagram Graph API. No scraping, no unofficial libraries, no password storage.

---

## Feasibility Classification

| Capability | Status | Notes |
|---|---|---|
| OAuth 2.0 Authorization Code Flow | ✅ **SUPPORTED** | Implemented via `/instagram/oauth/connect` → callback |
| Fetch user's own media list | ✅ **SUPPORTED** | `GET /me/media` with `instagram_business_basic` |
| Read caption, media URL, timestamp | ✅ **SUPPORTED** | Standard Graph API fields |
| Read profile (username, name) | ✅ **SUPPORTED** | `GET /{ig-user-id}?fields=id,username,name` |
| Long-lived token (60-day) | ✅ **SUPPORTED** | Exchanged server-side via `ig_exchange_token` |
| Analyze content through TrustGraph | ✅ **SUPPORTED** | Routes to existing ImageService/TextService/WebsiteService |
| Manual import / demo mode | ✅ **SUPPORTED** | No Instagram credentials needed |
| Read another user's private posts | ❌ **NOT SUPPORTED** | Requires user authorization — by design |
| Web scraping Instagram pages | ❌ **NOT SUPPORTED** | Prohibited by Meta Platform Terms |
| Instagram Basic Display API | ❌ **DEPRECATED** | Deprecated December 4, 2024 — not used |
| Access tokens exposed to frontend | ❌ **NOT IMPLEMENTED** | Tokens stored AES-256-GCM encrypted on backend only |
| Real-time Instagram webhooks | ⚠️ **REQUIRES APP REVIEW** | Not implemented in v1 |
| Public access beyond test users | ⚠️ **REQUIRES APP REVIEW** | Standard Access limited to app-registered testers |
| Publishing to Instagram | ⚠️ **REQUIRES `instagram_business_content_publish`** | Scope requested but publish endpoints not implemented |

---

## Required Meta Developer Configuration

### Step 1 — Create a Meta Developer App

1. Go to [developers.facebook.com](https://developers.facebook.com/)
2. Create a new app → Select **Business** type
3. Add the **Instagram Graph API** product to your app
4. Under **Instagram Graph API** → **Settings**, add your redirect URI:
   ```
   https://yourdomain.com/api/v1/instagram/oauth/callback
   ```
   For local development:
   ```
   http://localhost:5000/api/v1/instagram/oauth/callback
   ```

### Step 2 — Request Permissions

In your app's **App Review** → **Permissions and Features**, ensure you have:

| Permission | Purpose | Access Level |
|---|---|---|
| `instagram_business_basic` | Read user profile and media | Standard (test users only) → Advanced requires App Review |
| `instagram_business_content_publish` | Future: content publishing | Standard (test users only) |

### Step 3 — App Review (for production)

To serve users outside your test user list, submit your app for **Advanced Access**:
- Provide a screencast demonstrating the OAuth flow
- Show at least one successful API call per permission
- Agree to Meta Platform Terms and Developer Policies

---

## Environment Variables

Add these to your `.env` file:

```env
# ── Instagram / Meta Graph API ────────────────────────────────────────
INSTAGRAM_APP_ID=your_meta_app_id
INSTAGRAM_APP_SECRET=your_meta_app_secret
INSTAGRAM_REDIRECT_URI=http://localhost:5000/api/v1/instagram/oauth/callback

# Optional: separate encryption key for Instagram tokens
# Falls back to JWT_SECRET if absent
INSTAGRAM_TOKEN_SECRET=at_least_32_chars_random_string

# Frontend URL (for OAuth redirect back to UI)
CLIENT_URL=http://localhost:5173
```

> **NEVER commit** `INSTAGRAM_APP_SECRET` or `INSTAGRAM_TOKEN_SECRET` to version control.

---

## OAuth Flow

```
User clicks "Connect Instagram"
         │
         ▼
GET /api/v1/instagram/oauth/connect        ← JWT auth required
  - Generates cryptographic CSRF state
  - Stores state server-side (10min TTL)
  - Redirects browser to:
    https://www.instagram.com/oauth/authorize?...
         │
         ▼
Instagram consent screen
  - User approves or denies
         │
         ▼ (Meta redirects)
GET /api/v1/instagram/oauth/callback?code=...&state=...    ← PUBLIC endpoint
  - Validates CSRF state
  - POST https://api.instagram.com/oauth/access_token  →  short-lived token
  - GET  https://graph.instagram.com/access_token      →  long-lived token (60 days)
  - Fetches profile (username, name)
  - AES-256-GCM encrypts token
  - Saves to InstagramConnection (MongoDB)
  - Redirects browser to frontend: /dashboard/instagram?connected=true
```

---

## Token Security

| Property | Implementation |
|---|---|
| Encryption | AES-256-GCM with random IV per token |
| Key derivation | SHA-256 of `INSTAGRAM_TOKEN_SECRET` (or `JWT_SECRET`) |
| Storage | `InstagramConnection.encryptedAccessToken` field, `select: false` by default |
| Frontend exposure | **Never** — tokens never returned in any API response |
| Logging | **Never** — raw tokens never written to logs |
| Token type | Long-lived (60 days); expiry stored as `tokenExpiresAt` |
| Expiry warning | Shown in UI when ≤ 7 days remain |
| Revocation | `DELETE /api/v1/instagram/disconnect` deletes the connection + encrypted token |

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/instagram/config` | JWT | Integration config status |
| `GET` | `/api/v1/instagram/oauth/connect` | JWT | Initiates OAuth (browser redirect) |
| `GET` | `/api/v1/instagram/oauth/callback` | Public | OAuth callback from Meta |
| `GET` | `/api/v1/instagram/status` | JWT | User's connection status |
| `GET` | `/api/v1/instagram/media` | JWT | Fetch recent Instagram media |
| `POST` | `/api/v1/instagram/analyze` | JWT | Analyze content (live or manual) |
| `DELETE` | `/api/v1/instagram/disconnect` | JWT | Revoke connection |

Rate limiting: Instagram API-consuming endpoints are limited to **20 requests/min** per IP.

---

## Demo / Manual Import Mode

When `INSTAGRAM_APP_ID` is not configured (most development setups), the feature gracefully degrades:

- UI shows a **"Not Configured"** banner (not an error state)
- **Manual Content Import** form is always available
- Users can paste a caption, external link, and image URL
- TrustGraph runs the same analysis pipeline on the provided content
- Results are clearly labeled as **"Manual Import"** source (not live API)

This satisfies the requirement to **not make the feature appear broken** while being transparent about the data source.

---

## Local Development Setup

1. Create a Meta developer app (see above)
2. Add `http://localhost:5000/api/v1/instagram/oauth/callback` as a valid OAuth redirect URI
3. Add your account as a **Test User** in the app's Roles section
4. Copy your App ID and App Secret to `.env`
5. Start the backend: `npm start` (or `npm run dev`)
6. Start the frontend: `cd client && npm run dev`
7. Navigate to `/dashboard/instagram` and click **Connect Instagram Professional Account**

---

## Production Setup

1. Complete Meta App Review for Advanced Access
2. Set `INSTAGRAM_REDIRECT_URI` to your production callback URL
3. Set `CLIENT_URL` to your production frontend URL
4. Ensure `INSTAGRAM_TOKEN_SECRET` is at least 32 random characters
5. Store secrets in your hosting provider's secret manager (not `.env` files)

---

## Known Limitations

- **Only Instagram Professional accounts** (Business or Creator) are supported. Personal accounts are not supported by the Instagram Graph API.
- **Linked Facebook Page required**: The Professional Instagram account must be linked to a Facebook Page.
- **App Review required for non-test users**: Without Advanced Access approval, only accounts explicitly added as test users in your Meta developer app can authorize.
- **Token expiry**: Long-lived tokens expire after 60 days. TrustGraph will warn when ≤ 7 days remain; users must reconnect manually (automatic refresh not implemented in v1).
- **No real-time webhooks**: Media list is fetched on-demand, not streamed.
- **Multi-instance note**: The CSRF state store is in-memory. For multi-instance/serverless deployments, replace with Redis or DB-backed sessions.

---

## Security Checklist

- [x] OAuth state CSRF validation
- [x] AES-256-GCM token encryption at rest
- [x] `select: false` on encrypted token field (excluded from all queries by default)
- [x] Tokens never returned in API responses
- [x] Tokens never logged
- [x] Least-privilege scopes (`instagram_business_basic`)
- [x] Token expiry detection and UI warning
- [x] Disconnect/revoke endpoint
- [x] Audit logging (via `History` model) on connect and disconnect
- [x] Rate limiting on Instagram API-consuming endpoints (20 req/min)
- [x] Server-side only token exchange (App Secret never sent to frontend)
