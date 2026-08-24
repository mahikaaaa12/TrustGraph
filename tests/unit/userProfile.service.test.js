jest.mock('../../src/models/User');
jest.mock('../../src/models/History');
jest.mock('../../src/utils/jwt', () => ({
  generateToken: jest.fn(() => 'mocked_fresh_jwt_token'),
  verifyToken: jest.fn(() => ({ id: 'mock_user_id', role: 'analyst' })),
}));

const jwt = require('../../src/utils/jwt');
const AuthService = require('../../src/services/auth.service');
const User = require('../../src/models/User');
const History = require('../../src/models/History');
const AppError = require('../../src/utils/appError');

describe('User Profile & Account Security Management Unit Tests', () => {
  beforeEach(() => {
    jwt.generateToken.mockReturnValue('mocked_fresh_jwt_token');
    jwt.verifyToken.mockReturnValue({ id: 'mock_user_id', role: 'analyst' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Profile Information Updates', () => {
    it('should allow user to update their display name and avatar', async () => {
      const mockUser = {
        _id: 'mock_user_123',
        name: 'Initial Name',
        avatar: '',
        role: 'analyst',
        save: jest.fn().mockResolvedValue(true),
        toObject: function () {
          return { _id: this._id, name: this.name, avatar: this.avatar, role: this.role };
        },
      };

      User.findById.mockResolvedValue(mockUser);

      const updated = await AuthService.updateProfile('mock_user_123', {
        name: 'Neo Anderson',
        avatar: 'https://example.com/avatar.png',
      });

      expect(mockUser.name).toBe('Neo Anderson');
      expect(mockUser.avatar).toBe('https://example.com/avatar.png');
      expect(mockUser.save).toHaveBeenCalled();
      expect(updated.name).toBe('Neo Anderson');
      expect(updated.role).toBe('analyst');
    });

    it('should ignore attempts to arbitrarily elevate role or modify account ID', async () => {
      const mockUser = {
        _id: 'mock_user_123',
        name: 'Initial Name',
        role: 'analyst',
        save: jest.fn().mockResolvedValue(true),
        toObject: function () {
          return { _id: this._id, name: this.name, role: this.role };
        },
      };

      User.findById.mockResolvedValue(mockUser);

      const updated = await AuthService.updateProfile('mock_user_123', {
        name: 'Agent Smith Updated',
        role: 'admin',
        _id: 'fake_id_123',
      });

      expect(mockUser.name).toBe('Agent Smith Updated');
      expect(mockUser.role).toBe('analyst'); // Role protected
      expect(String(updated._id)).toBe('mock_user_123'); // ID protected
    });
  });

  describe('2. Change Password Security', () => {
    it('should throw 401 when current password does not match', async () => {
      const mockUser = {
        comparePassword: jest.fn().mockResolvedValue(false),
      };

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      await expect(
        AuthService.changePassword('mock_user_123', {
          currentPassword: 'WrongPassword999!',
          newPassword: 'NewSecurePassword123!',
          confirmPassword: 'NewSecurePassword123!',
        })
      ).rejects.toThrow(/Current password is incorrect/);
    });

    it('should throw 400 when new password and confirm password do not match', async () => {
      await expect(
        AuthService.changePassword('mock_user_123', {
          currentPassword: 'OldPassword123!',
          newPassword: 'NewSecurePassword123!',
          confirmPassword: 'DifferentPassword456!',
        })
      ).rejects.toThrow(/New passwords do not match/);
    });

    it('should throw 400 when new password fails complexity requirements', async () => {
      await expect(
        AuthService.changePassword('mock_user_123', {
          currentPassword: 'OldPassword123!',
          newPassword: 'weakpassword',
          confirmPassword: 'weakpassword',
        })
      ).rejects.toThrow(/security requirements/);
    });

    it('should successfully update password and rotate token when valid', async () => {
      const mockUser = {
        _id: 'mock_user_123',
        role: 'analyst',
        comparePassword: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true),
      };

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });
      History.create.mockResolvedValue(true);

      const result = await AuthService.changePassword('mock_user_123', {
        currentPassword: 'OldPassword123!',
        newPassword: 'BrandNewPassword456@#$',
        confirmPassword: 'BrandNewPassword456@#$',
      });

      expect(result.message).toBe('Password changed successfully.');
      expect(result.token).toBe('mocked_fresh_jwt_token');
      expect(mockUser.save).toHaveBeenCalled();
    });
  });

  describe('3. Account Preferences & Login Activity', () => {
    it('should update communication and alert preferences', async () => {
      const mockUser = {
        preferences: { emailNotifications: true, securityAlerts: true },
        save: jest.fn().mockResolvedValue(true),
      };

      User.findById.mockResolvedValue(mockUser);

      const prefs = await AuthService.updatePreferences('mock_user_123', {
        emailNotifications: false,
      });

      expect(prefs.emailNotifications).toBe(false);
      expect(prefs.securityAlerts).toBe(true);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should retrieve login activity history', async () => {
      const mockUser = {
        loginHistory: [
          { ip: '192.168.1.50', userAgent: 'Chrome on MacOS', status: 'Successful', timestamp: new Date() },
        ],
      };

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const history = await AuthService.getLoginActivity('mock_user_123');
      expect(history.length).toBe(1);
      expect(history[0].ip).toBe('192.168.1.50');
      expect(history[0].status).toBe('Successful');
    });
  });

  describe('4. Danger Zone - Account Deletion', () => {
    it('should reject deletion with invalid password confirmation', async () => {
      const mockUser = {
        comparePassword: jest.fn().mockResolvedValue(false),
      };

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      await expect(
        AuthService.deleteAccount('mock_user_123', { password: 'WrongPassword123!' })
      ).rejects.toThrow(/Password confirmation failed/);
    });

    it('should permanently delete user account on correct password confirmation', async () => {
      const mockUser = {
        _id: 'mock_user_123',
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });
      User.findByIdAndDelete.mockResolvedValue(mockUser);

      const delRes = await AuthService.deleteAccount('mock_user_123', { password: 'CorrectPassword123!' });
      expect(delRes.message).toContain('deleted');
      expect(User.findByIdAndDelete).toHaveBeenCalledWith('mock_user_123');
    });
  });
});
