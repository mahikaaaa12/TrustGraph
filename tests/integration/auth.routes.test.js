jest.mock('mongoose', () => {
  const original = jest.requireActual('mongoose');
  return {
    ...original,
    connection: {
      readyState: 1,
      on: jest.fn(),
      once: jest.fn(),
    },
  };
});
jest.mock('../../src/models/User');
jest.mock('../../src/models/History');

const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');

describe('Auth Routes Integration Tests (Supertest)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return 200 OK with server and database status', async () => {
      const res = await request(app).get('/health');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('server', 'running');
      expect(res.body).toHaveProperty('database', 'connected');
    });
  });

  describe('POST /api/v1/auth/signup', () => {
    it('should create a user and return 201 Created', async () => {
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        _id: 'mock_id',
        name: 'Integration User',
        email: 'integration@trustgraph.ai',
        role: 'user',
        toObject: () => ({ _id: 'mock_id', name: 'Integration User', email: 'integration@trustgraph.ai' }),
      });

      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          name: 'Integration User',
          email: 'integration@trustgraph.ai',
          password: 'Password123!',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('token');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return 401 Unauthorized if Authorization header is missing', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });
});
