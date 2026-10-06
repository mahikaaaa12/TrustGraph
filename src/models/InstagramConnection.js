const mongoose = require('mongoose');
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const ENCODING = 'hex';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Returns the 32-byte encryption key derived from INSTAGRAM_TOKEN_SECRET env var.
 * Falls back to a key derived from JWT_SECRET if the dedicated var is absent.
 * Throws clearly if neither is usable.
 */
function getEncryptionKey() {
  const raw = process.env.INSTAGRAM_TOKEN_SECRET || process.env.JWT_SECRET;
  if (!raw) throw new Error('No encryption key available for token storage');
  return crypto.createHash('sha256').update(raw).digest(); // always 32 bytes
}

/**
 * AES-256-GCM encryption — stores iv:authTag:ciphertext as hex string.
 * @param {string} plaintext
 * @returns {string}
 */
function encryptToken(plaintext) {
  if (!plaintext) return null;
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString(ENCODING), authTag.toString(ENCODING), encrypted.toString(ENCODING)].join(':');
}

/**
 * Decrypts an AES-256-GCM token produced by encryptToken().
 * @param {string} stored
 * @returns {string}
 */
function decryptToken(stored) {
  if (!stored) return null;
  const key = getEncryptionKey();
  const parts = stored.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted token format');
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, ENCODING);
  const authTag = Buffer.from(authTagHex, ENCODING);
  const encrypted = Buffer.from(encryptedHex, ENCODING);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

/**
 * InstagramConnection — stores a user's Instagram OAuth credentials.
 * Access tokens are stored AES-256-GCM encrypted; they are NEVER returned
 * from any API endpoint to the frontend.
 */
const instagramConnectionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      unique: true,
    },
    /** Instagram platform user ID (numeric string) */
    instagramUserId: {
      type: String,
      required: true,
    },
    /** Display username, safe to expose */
    username: {
      type: String,
      default: '',
    },
    /** Display name, safe to expose */
    name: {
      type: String,
      default: '',
    },
    /** AES-256-GCM encrypted long-lived access token */
    encryptedAccessToken: {
      type: String,
      select: false, // excluded from all queries by default
    },
    /** Token expiry timestamp (long-lived tokens live 60 days) */
    tokenExpiresAt: {
      type: Date,
    },
    /** ISO 8601 of last successful token refresh */
    tokenRefreshedAt: {
      type: Date,
    },
    /** Whether the connection is active and token is presumed valid */
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    /** Scopes granted by the user at authorization time */
    grantedScopes: {
      type: [String],
      default: [],
    },
    /** Last time media was successfully fetched */
    lastFetchedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

/**
 * Store a plaintext token by encrypting it before saving.
 * Called by the service layer — never accepts raw tokens in the schema directly.
 */
instagramConnectionSchema.methods.setAccessToken = function (plainToken) {
  this.encryptedAccessToken = encryptToken(plainToken);
  this.tokenRefreshedAt = new Date();
};

/**
 * Retrieve and decrypt the access token. Returns null if none stored.
 * The document MUST have been queried with +encryptedAccessToken.
 */
instagramConnectionSchema.methods.getAccessToken = function () {
  return decryptToken(this.encryptedAccessToken);
};

/**
 * Virtual: returns true when the stored token has not yet expired.
 */
instagramConnectionSchema.virtual('isTokenValid').get(function () {
  if (!this.tokenExpiresAt) return false;
  return this.tokenExpiresAt > new Date();
});

/**
 * Returns a safe public-facing representation (no token fields).
 */
instagramConnectionSchema.methods.toPublicObject = function () {
  return {
    instagramUserId: this.instagramUserId,
    username: this.username,
    name: this.name,
    isActive: this.isActive,
    grantedScopes: this.grantedScopes,
    tokenExpiresAt: this.tokenExpiresAt,
    tokenRefreshedAt: this.tokenRefreshedAt,
    lastFetchedAt: this.lastFetchedAt,
    connectedAt: this.createdAt,
  };
};

module.exports = mongoose.model('InstagramConnection', instagramConnectionSchema);
