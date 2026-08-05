jest.mock('../../src/models/User');
jest.mock('../../src/models/History');
jest.mock('../../src/utils/jwt', () => ({
  generateToken: jest.fn(() => 'mocked_jwt_token_string'),
  verifyToken: jest.fn(() => ({ id: 'mock_user_id', role: 'user' })),
}));

const AuthService = require('../../src/services/auth.service');
const User = require('../../src/models/User');
const History = require('../../src/models/History');
const AppError = require('../../src/utils/appError');

describe('AuthService Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signup()', () => {
    it('should successfully register a new user and return user object with JWT token', async () => {
      const mockUserData = {
        name: 'Sarah Connor',
        email: 'sarah@cyberdyne.org',
        password: 'Password123!',
        role: 'user',
      };

      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        _id: 'mock_user_id',
        ...mockUserData,
        toObject: () => ({ _id: 'mock_user_id', name: 'Sarah Connor', email: 'sarah@cyberdyne.org', role: 'user' }),
      });
      History.create.mockResolvedValue(true);

      const result = await AuthService.signup(mockUserData);

      expect(User.findOne).toHaveBeenCalledWith({ email: 'sarah@cyberdyne.org' });
      expect(User.create).toHaveBeenCalled();
      expect(result).toHaveProperty('token');
      expect(result.user).toHaveProperty('email', 'sarah@cyberdyne.org');
    });

    it('should throw AppError with 409 status if email is already registered', async () => {
      User.findOne.mockResolvedValue({ email: 'existing@trustgraph.ai' });

      await expect(
        AuthService.signup({ name: 'Test', email: 'existing@trustgraph.ai', password: 'Password123!' })
      ).rejects.toThrow(AppError);
    });
  });

  describe('login()', () => {
    it('should authenticate valid user credentials and return JWT token', async () => {
      const mockUser = {
        _id: 'mock_user_id',
        email: 'sarah@cyberdyne.org',
        role: 'user',
        comparePassword: jest.fn().mockResolvedValue(true),
        toObject: () => ({ _id: 'mock_user_id', email: 'sarah@cyberdyne.org', role: 'user' }),
      };

      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await AuthService.login({ email: 'sarah@cyberdyne.org', password: 'Password123!' });

      expect(result).toHaveProperty('token');
      expect(mockUser.comparePassword).toHaveBeenCalledWith('Password123!');
    });

    it('should throw AppError with 401 status for invalid password', async () => {
      const mockUser = {
        comparePassword: jest.fn().mockResolvedValue(false),
      };

      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      await expect(
        AuthService.login({ email: 'sarah@cyberdyne.org', password: 'WrongPassword' })
      ).rejects.toThrow(AppError);
    });
  });
});
