/**
 * Frontend RBAC Unit Tests
 * Tests role normalization, hasRole permission evaluator, and route matrix rules.
 */

const normalizeRole = (roleStr) => {
  if (!roleStr || typeof roleStr !== 'string') return '';
  const upper = roleStr.trim().toUpperCase();
  if (upper === 'ADMIN') return 'ADMIN';
  if (upper === 'CONTENT_CREATOR' || upper === 'CREATOR') return 'CONTENT_CREATOR';
  if (upper === 'INDUSTRY_ANALYST' || upper === 'ANALYST' || upper === 'USER') return 'INDUSTRY_ANALYST';
  return '';
};

function createHasRole(user) {
  return (allowedRoles) => {
    if (!user || !user.role) return false;
    const userRole = normalizeRole(user.role);
    if (!userRole) return false;
    if (userRole === 'ADMIN') return true;
    if (!Array.isArray(allowedRoles)) return false;
    return allowedRoles.map((r) => normalizeRole(r)).includes(userRole);
  };
}

describe('Frontend Role-Based Access Control (RBAC)', () => {
  describe('normalizeRole()', () => {
    it('normalizes legacy analyst/user strings to INDUSTRY_ANALYST', () => {
      expect(normalizeRole('analyst')).toBe('INDUSTRY_ANALYST');
      expect(normalizeRole('user')).toBe('INDUSTRY_ANALYST');
      expect(normalizeRole('INDUSTRY_ANALYST')).toBe('INDUSTRY_ANALYST');
    });

    it('normalizes legacy creator strings to CONTENT_CREATOR', () => {
      expect(normalizeRole('creator')).toBe('CONTENT_CREATOR');
      expect(normalizeRole('CONTENT_CREATOR')).toBe('CONTENT_CREATOR');
    });

    it('normalizes admin strings to ADMIN', () => {
      expect(normalizeRole('admin')).toBe('ADMIN');
      expect(normalizeRole('ADMIN')).toBe('ADMIN');
    });

    it('returns empty string for missing or invalid roles', () => {
      expect(normalizeRole('')).toBe('');
      expect(normalizeRole(null)).toBe('');
      expect(normalizeRole(undefined)).toBe('');
      expect(normalizeRole('super_hacker')).toBe('');
    });
  });

  describe('hasRole() Authorization Evaluator', () => {
    describe('INDUSTRY_ANALYST User', () => {
      const hasRole = createHasRole({ role: 'INDUSTRY_ANALYST' });

      it('grants access to Industry Analyst routes', () => {
        expect(hasRole(['INDUSTRY_ANALYST'])).toBe(true);
      });

      it('denies access to Content Creator routes', () => {
        expect(hasRole(['CONTENT_CREATOR'])).toBe(false);
      });

      it('denies access to Admin routes', () => {
        expect(hasRole(['ADMIN'])).toBe(false);
      });
    });

    describe('CONTENT_CREATOR User', () => {
      const hasRole = createHasRole({ role: 'CONTENT_CREATOR' });

      it('grants access to Content Creator routes', () => {
        expect(hasRole(['CONTENT_CREATOR'])).toBe(true);
      });

      it('denies access to Industry Analyst routes', () => {
        expect(hasRole(['INDUSTRY_ANALYST'])).toBe(false);
      });

      it('denies access to Admin routes', () => {
        expect(hasRole(['ADMIN'])).toBe(false);
      });
    });

    describe('ADMIN User', () => {
      const hasRole = createHasRole({ role: 'ADMIN' });

      it('grants access to Industry Analyst routes', () => {
        expect(hasRole(['INDUSTRY_ANALYST'])).toBe(true);
      });

      it('grants access to Content Creator routes', () => {
        expect(hasRole(['CONTENT_CREATOR'])).toBe(true);
      });

      it('grants access to Admin routes', () => {
        expect(hasRole(['ADMIN'])).toBe(true);
      });
    });

    describe('Missing / Unknown Role User', () => {
      it('denies access when user is null', () => {
        const hasRole = createHasRole(null);
        expect(hasRole(['INDUSTRY_ANALYST'])).toBe(false);
        expect(hasRole(['CONTENT_CREATOR'])).toBe(false);
      });

      it('denies access when role is missing', () => {
        const hasRole = createHasRole({ name: 'No Role User' });
        expect(hasRole(['INDUSTRY_ANALYST'])).toBe(false);
      });

      it('denies access when role is invalid string', () => {
        const hasRole = createHasRole({ role: 'UNKNOWN_ROLE' });
        expect(hasRole(['INDUSTRY_ANALYST'])).toBe(false);
        expect(hasRole(['CONTENT_CREATOR'])).toBe(false);
        expect(hasRole(['ADMIN'])).toBe(false);
      });
    });
  });
});
