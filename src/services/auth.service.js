const crypto = require('crypto');
const User = require('../models/User');
const History = require('../models/History');
const AppError = require('../utils/appError');
const { generateToken } = require('../utils/jwt');
const { HTTP_STATUS } = require('../constants');

/**
 * Authentication & Account Management Service
 */
class AuthService {
  /**
   * Registers a new user in the system.
   */
  static async signup(userData, reqInfo = {}) {
    const { name, email, password, role } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('An account with this email address already exists.', HTTP_STATUS.CONFLICT);
    }

    const initialLogin = {
      timestamp: new Date(),
      ip: reqInfo.ip || '127.0.0.1',
      userAgent: reqInfo.userAgent || 'Browser',
      status: 'Successful',
    };

    // Create user (password will be hashed via Mongoose pre-save hook)
    const newUser = await User.create({
      name,
      email,
      password,
      role: role || 'user',
      lastLoginAt: new Date(),
      lastPasswordChangeAt: new Date(),
      loginHistory: [initialLogin],
    });

    // Generate JWT token
    const token = generateToken({ id: newUser._id, role: newUser.role });

    // Log audit action
    await History.create({
      userId: newUser._id,
      action: 'SETTINGS_CHANGE',
      entityId: newUser._id,
      entityType: 'User',
      details: { message: 'User account created' },
      ipAddress: reqInfo.ip || '0.0.0.0',
      userAgent: reqInfo.userAgent || 'Unknown',
    });

    // Sanitize user output (remove password)
    const userObj = newUser.toObject();
    delete userObj.password;

    return { user: userObj, token };
  }

  /**
   * Authenticates user credentials and returns a signed JWT token.
   */
  static async login({ email, password }, reqInfo = {}) {
    if (!email || !password) {
      throw new AppError('Please provide both email and password.', HTTP_STATUS.BAD_REQUEST);
    }

    // Fetch user and explicitly include password field for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      throw new AppError('Invalid email address or password.', HTTP_STATUS.UNAUTHORIZED);
    }

    // Record login entry in history (keep latest 10)
    const loginEntry = {
      timestamp: new Date(),
      ip: reqInfo.ip || '127.0.0.1',
      userAgent: reqInfo.userAgent || 'Browser',
      status: 'Successful',
    };

    user.lastLoginAt = new Date();
    if (!user.loginHistory) user.loginHistory = [];
    user.loginHistory.unshift(loginEntry);
    if (user.loginHistory.length > 10) {
      user.loginHistory = user.loginHistory.slice(0, 10);
    }
    if (typeof user.save === 'function') {
      await user.save({ validateBeforeSave: false });
    }

    // Generate JWT token
    const token = generateToken({ id: user._id, role: user.role });

    // Log audit history
    await History.create({
      userId: user._id,
      action: 'SETTINGS_CHANGE',
      entityId: user._id,
      entityType: 'User',
      details: { message: 'User logged in successfully' },
      ipAddress: reqInfo.ip || '0.0.0.0',
      userAgent: reqInfo.userAgent || 'Unknown',
    });

    const userObj = user.toObject();
    delete userObj.password;

    return { user: userObj, token };
  }

  /**
   * Updates basic profile information (Full Name, Avatar).
   * Strict Rule: Does not allow modifying role, status, email, or ID.
   */
  static async updateProfile(userId, { name, avatar }) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found.', HTTP_STATUS.NOT_FOUND);
    }

    if (name && typeof name === 'string' && name.trim().length > 0) {
      user.name = name.trim().substring(0, 100);
    }

    if (typeof avatar === 'string') {
      user.avatar = avatar.trim();
    }

    await user.save({ validateBeforeSave: false });

    const userObj = user.toObject();
    delete userObj.password;

    return userObj;
  }

  /**
   * Validates and updates user password.
   * Enforces complexity rules and rotates token.
   */
  static async changePassword(userId, { currentPassword, newPassword, confirmPassword }, reqInfo = {}) {
    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new AppError('Please provide current password, new password, and confirmation.', HTTP_STATUS.BAD_REQUEST);
    }

    if (newPassword !== confirmPassword) {
      throw new AppError('New passwords do not match.', HTTP_STATUS.BAD_REQUEST);
    }

    // Password complexity check
    const minLength = newPassword.length >= 8;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasDigit = /[0-9]/.test(newPassword);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);

    if (!minLength || !hasUpper || !hasLower || !hasDigit || !hasSpecial) {
      throw new AppError(
        'Password does not meet the security requirements: Must be at least 8 characters and include uppercase, lowercase, a number, and a special character.',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new AppError('User not found.', HTTP_STATUS.NOT_FOUND);
    }

    const isCurrentValid = await user.comparePassword(currentPassword);
    if (!isCurrentValid) {
      throw new AppError('Current password is incorrect.', HTTP_STATUS.UNAUTHORIZED);
    }

    // Set new password (pre-save hook hashes with bcrypt salt 12)
    user.password = newPassword;
    user.lastPasswordChangeAt = new Date();
    await user.save();

    // Rotate token
    const token = generateToken({ id: user._id, role: user.role });

    // Log password change event in History
    await History.create({
      userId: user._id,
      action: 'SETTINGS_CHANGE',
      entityId: user._id,
      entityType: 'User',
      details: { message: 'Password changed successfully' },
      ipAddress: reqInfo.ip || '0.0.0.0',
      userAgent: reqInfo.userAgent || 'Unknown',
    });

    return {
      message: 'Password changed successfully.',
      token,
      lastPasswordChangeAt: user.lastPasswordChangeAt,
    };
  }

  /**
   * Updates notification and alert preferences.
   */
  static async updatePreferences(userId, newPreferences = {}) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found.', HTTP_STATUS.NOT_FOUND);
    }

    user.preferences = {
      ...user.preferences,
      ...newPreferences,
    };

    await user.save({ validateBeforeSave: false });

    return user.preferences;
  }

  /**
   * Retrieves recent login history for user.
   */
  static async getLoginActivity(userId) {
    const user = await User.findById(userId).select('loginHistory createdAt');
    if (!user) {
      throw new AppError('User not found.', HTTP_STATUS.NOT_FOUND);
    }

    const history = user.loginHistory || [];
    return history;
  }

  /**
   * Deletes user account upon password confirmation.
   */
  static async deleteAccount(userId, { password }, reqInfo = {}) {
    if (!password) {
      throw new AppError('Password confirmation is required to delete your account.', HTTP_STATUS.BAD_REQUEST);
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new AppError('User not found.', HTTP_STATUS.NOT_FOUND);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Password confirmation failed: Incorrect password.', HTTP_STATUS.UNAUTHORIZED);
    }

    await User.findByIdAndDelete(userId);

    return { message: 'User account and all associated profile records have been permanently deleted.' };
  }

  /**
   * Generates a password reset token for a user who forgot their password.
   */
  static async forgotPassword(email) {
    if (!email) {
      throw new AppError('Please provide an email address.', HTTP_STATUS.BAD_REQUEST);
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError('No user account found with that email address.', HTTP_STATUS.NOT_FOUND);
    }

    // Generate plain reset token and save hashed token to DB
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    return { resetToken, email: user.email };
  }

  /**
   * Resets password given a valid reset token and new password string.
   */
  static async resetPassword(resetToken, newPassword) {
    if (!resetToken || !newPassword) {
      throw new AppError('Reset token and new password are required.', HTTP_STATUS.BAD_REQUEST);
    }

    // Hash plain reset token to match stored format
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Find user with matching active token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      throw new AppError('Reset token is invalid or has expired.', HTTP_STATUS.BAD_REQUEST);
    }

    // Update password (triggers pre-save hashing hook)
    user.password = newPassword;
    user.lastPasswordChangeAt = new Date();
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Generate fresh JWT token
    const token = generateToken({ id: user._id, role: user.role });

    return { message: 'Password reset successful.', token };
  }
}

module.exports = AuthService;
