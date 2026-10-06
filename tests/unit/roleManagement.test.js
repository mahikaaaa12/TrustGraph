/**
 * Unit & Integration Tests for Admin Role Management & Safety Enforcement
 */

const request = require('supertest');
const createApp = require('../../src/app');
const User = require('../../src/models/User');
const History = require('../../src/models/History');
const { generateToken } = require('../../src/utils/jwt');

describe('Admin User Role Management Security', () => {
  let app;

  beforeAll(() => {
    app = createApp;
  });

  describe('PATCH /api/v1/auth/users/:id/role Authorization', () => {
    it('returns 401 Unauthorized when unauthenticated', async () => {
      const res = await request(app)
        .patch('/api/v1/auth/users/60d5ecb8b5c9c20015f8e001/role')
        .send({ role: 'ADMIN' });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 403 Forbidden when accessed by INDUSTRY_ANALYST', async () => {
      const analystUser = new User({
        _id: '60d5ecb8b5c9c20015f8e001',
        name: 'Analyst User',
        email: 'analyst@test.com',
        role: 'INDUSTRY_ANALYST',
      });
      jest.spyOn(User, 'findById').mockResolvedValue(analystUser);

      const token = generateToken({ id: analystUser._id, role: analystUser.role });

      const res = await request(app)
        .patch('/api/v1/auth/users/60d5ecb8b5c9c20015f8e002/role')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'ADMIN' });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);

      User.findById.mockRestore();
    });

    it('returns 403 Forbidden when accessed by CONTENT_CREATOR', async () => {
      const creatorUser = new User({
        _id: '60d5ecb8b5c9c20015f8e002',
        name: 'Creator User',
        email: 'creator@test.com',
        role: 'CONTENT_CREATOR',
      });
      jest.spyOn(User, 'findById').mockResolvedValue(creatorUser);

      const token = generateToken({ id: creatorUser._id, role: creatorUser.role });

      const res = await request(app)
        .patch('/api/v1/auth/users/60d5ecb8b5c9c20015f8e001/role')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'ADMIN' });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);

      User.findById.mockRestore();
    });

    it('prevents demoting the last remaining ADMIN account (400 Bad Request)', async () => {
      const adminUser = new User({
        _id: '60d5ecb8b5c9c20015f8e003',
        name: 'Sole Admin',
        email: 'admin@test.com',
        role: 'ADMIN',
      });

      jest.spyOn(User, 'findById').mockImplementation((id) => {
        if (String(id) === String(adminUser._id)) return Promise.resolve(adminUser);
        return Promise.resolve(null);
      });

      jest.spyOn(User, 'countDocuments').mockResolvedValue(1);

      const token = generateToken({ id: adminUser._id, role: adminUser.role });

      const res = await request(app)
        .patch(`/api/v1/auth/users/${adminUser._id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'INDUSTRY_ANALYST' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Cannot demote or remove the last remaining Administrator account');

      User.findById.mockRestore();
      User.countDocuments.mockRestore();
    });

    it('allows ADMIN to update role when allowed and logs audit trail', async () => {
      const adminUser = new User({
        _id: '60d5ecb8b5c9c20015f8e003',
        name: 'Admin User',
        email: 'admin@test.com',
        role: 'ADMIN',
      });

      const targetUser = new User({
        _id: '60d5ecb8b5c9c20015f8e004',
        name: 'Target User',
        email: 'target@test.com',
        role: 'INDUSTRY_ANALYST',
      });

      jest.spyOn(User, 'findById').mockImplementation((id) => {
        if (String(id) === String(adminUser._id)) return Promise.resolve(adminUser);
        if (String(id) === String(targetUser._id)) return Promise.resolve(targetUser);
        return Promise.resolve(null);
      });

      jest.spyOn(User.prototype, 'save').mockResolvedValue(true);
      jest.spyOn(History, 'create').mockResolvedValue({});

      const token = generateToken({ id: adminUser._id, role: adminUser.role });

      const res = await request(app)
        .patch(`/api/v1/auth/users/${targetUser._id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'CONTENT_CREATOR' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('CONTENT_CREATOR');

      User.findById.mockRestore();
      User.prototype.save.mockRestore();
      History.create.mockRestore();
    });
  });
});
