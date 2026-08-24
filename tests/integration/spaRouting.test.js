const request = require('supertest');
const app = require('../../src/app');

describe('Production SPA Deep-Link Routing & API Boundary Integration Tests', () => {
  describe('1. Direct Navigation & Deep-Link Frontend Routes', () => {
    const deepLinkRoutes = [
      '/login',
      '/signup',
      '/dashboard',
      '/dashboard/profile',
      '/dashboard/reports',
      '/dashboard/history',
      '/dashboard/simulator',
      '/dashboard/investigation',
      '/dashboard/settings',
      '/dashboard/notifications',
    ];

    deepLinkRoutes.forEach((route) => {
      it(`should return HTTP 200 with HTML content for direct access to ${route}`, async () => {
        const res = await request(app).get(route);
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/html/);
        expect(res.text).toContain('<!doctype html>');
      });
    });
  });

  describe('2. Backend API Route Boundaries (Non-SPA)', () => {
    it('should return JSON 404 for unknown /api/* endpoints and NEVER return index.html', async () => {
      const res = await request(app).get('/api/v1/nonexistent-route-endpoint');
      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toMatch(/json/);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toContain('not found');
      expect(res.text).not.toContain('<!doctype html>');
    });

    it('should continue responding with JSON for API endpoints', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.headers['content-type']).toMatch(/json/);
      expect(res.body).toHaveProperty('server');
    });
  });
});
