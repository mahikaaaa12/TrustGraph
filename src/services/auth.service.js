const crypto = require('crypto');
const User = require('../models/User');
const History = require('../models/History');
const AppError = require('../utils/appError');
const { generateToken } = require('../utils/jwt');
const { HTTP_STATUS } = require('../constants');

/**
 * Authentication Business Logic Service Layer
 * Encapsulates database queries, password checks, token generation, and audit logging.
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

    // Create user (password will be hashed via Mongoose pre-save hook)
    const newUser = await User.create({
      name,
      email,
      password,
      role: role || 'user',
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
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Generate fresh JWT token
    const token = generateToken({ id: user._id, role: user.role });

    return { message: 'Password reset successful.', token };
  }
}

module.exports = AuthService;
