/**
 * RBAC (Role-Based Access Control) Unit & Integration Tests
 *
 * Tests:
 * 1. Role normalization and defaults on User schema
 * 2. restrictTo / requireRole authorization middleware enforcement:
 *    - INDUSTRY_ANALYST → Analyst API = Allowed
 *    - INDUSTRY_ANALYST → Creator API = 403 Forbidden
 *    - INDUSTRY_ANALYST → Admin API   = 403 Forbidden
 *    - CONTENT_CREATOR  → Creator API = Allowed
 *    - CONTENT_CREATOR  → Analyst API = 403 Forbidden
 *    - CONTENT_CREATOR  → Admin API   = 403 Forbidden
 *    - ADMIN            → Analyst API = Allowed
 *    - ADMIN            → Creator API = Allowed
 *    - ADMIN            → Admin API   = Allowed
 *    - Unauthenticated  → Protected API = 401 Unauthorized
 */

const { restrictTo, requireRole } = require('../../src/middlewares/auth.middleware');
const AppError = require('../../src/utils/appError');
const User = require('../../src/models/User');

describe('Role-Based Access Control (RBAC)', () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: null };
    res = {};
    next = jest.fn();
  });

  // ── 1. User Model Schema Role Normalization ───────────────────────
  describe('User Schema Role Field & Normalization', () => {
    it('defaults role to INDUSTRY_ANALYST when not provided', () => {
      const user = new User({ name: 'Test User', email: 'test@example.com', password: 'password123' });
      expect(user.role).toBe('INDUSTRY_ANALYST');
    });

    it('normalizes legacy "analyst" and "user" input to INDUSTRY_ANALYST', () => {
      const user1 = new User({ name: 'Analyst', email: 'a@example.com', password: 'password123', role: 'analyst' });
      expect(user1.role).toBe('INDUSTRY_ANALYST');

      const user2 = new User({ name: 'User', email: 'u@example.com', password: 'password123', role: 'user' });
      expect(user2.role).toBe('INDUSTRY_ANALYST');
    });

    it('normalizes legacy "creator" input to CONTENT_CREATOR', () => {
      const user = new User({ name: 'Creator', email: 'c@example.com', password: 'password123', role: 'creator' });
      expect(user.role).toBe('CONTENT_CREATOR');
    });

    it('normalizes "admin" input to ADMIN', () => {
      const user = new User({ name: 'Admin', email: 'ad@example.com', password: 'password123', role: 'admin' });
      expect(user.role).toBe('ADMIN');
    });
  });

  // ── 2. Middleware Authorization Matrix Tests ──────────────────────
  describe('restrictTo / requireRole Authorization Matrix', () => {
    // Unauthenticated Check
    it('returns 401 Unauthorized when unauthenticated (req.user is null)', () => {
      const middleware = restrictTo('INDUSTRY_ANALYST');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(401);
    });

    // Analyst Role Tests
    describe('INDUSTRY_ANALYST Permissions', () => {

      it('allows INDUSTRY_ANALYST to access Industry Analyst API', () => {
        req.user = { role: 'INDUSTRY_ANALYST' };
        const middleware = restrictTo('INDUSTRY_ANALYST');
        middleware(req, res, next);

        expect(next).toHaveBeenCalledWith(); // called with no error
      });

      it('denies INDUSTRY_ANALYST from accessing Content Creator API (403 Forbidden)', () => {
        req.user = { role: 'INDUSTRY_ANALYST' };
        const middleware = restrictTo('CONTENT_CREATOR');
        middleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        const error = next.mock.calls[0][0];
        expect(error).toBeInstanceOf(AppError);
        expect(error.statusCode).toBe(403);
      });

      it('denies INDUSTRY_ANALYST from accessing Admin API (403 Forbidden)', () => {
        req.user = { role: 'INDUSTRY_ANALYST' };
        const middleware = restrictTo('ADMIN');
        middleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        const error = next.mock.calls[0][0];
        expect(error).toBeInstanceOf(AppError);
        expect(error.statusCode).toBe(403);
      });
    });

    // Content Creator Role Tests
    describe('CONTENT_CREATOR Permissions', () => {
      it('allows CONTENT_CREATOR to access Content Creator API', () => {
        req.user = { role: 'CONTENT_CREATOR' };
        const middleware = restrictTo('CONTENT_CREATOR');
        middleware(req, res, next);

        expect(next).toHaveBeenCalledWith();
      });

      it('denies CONTENT_CREATOR from accessing Industry Analyst API (403 Forbidden)', () => {
        req.user = { role: 'CONTENT_CREATOR' };
        const middleware = restrictTo('INDUSTRY_ANALYST');
        middleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        const error = next.mock.calls[0][0];
        expect(error).toBeInstanceOf(AppError);
        expect(error.statusCode).toBe(403);
      });

      it('denies CONTENT_CREATOR from accessing Admin API (403 Forbidden)', () => {
        req.user = { role: 'CONTENT_CREATOR' };
        const middleware = restrictTo('ADMIN');
        middleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        const error = next.mock.calls[0][0];
        expect(error).toBeInstanceOf(AppError);
        expect(error.statusCode).toBe(403);
      });
    });

    // Admin Role Tests
    describe('ADMIN Full System Permissions', () => {
      it('allows ADMIN to access Industry Analyst API', () => {
        req.user = { role: 'ADMIN' };
        const middleware = restrictTo('INDUSTRY_ANALYST');
        middleware(req, res, next);

        expect(next).toHaveBeenCalledWith();
      });

      it('allows ADMIN to access Content Creator API', () => {
        req.user = { role: 'ADMIN' };
        const middleware = restrictTo('CONTENT_CREATOR');
        middleware(req, res, next);

        expect(next).toHaveBeenCalledWith();
      });

      it('allows ADMIN to access Admin API', () => {
        req.user = { role: 'ADMIN' };
        const middleware = restrictTo('ADMIN');
        middleware(req, res, next);

        expect(next).toHaveBeenCalledWith();
      });
    });
  });
});
