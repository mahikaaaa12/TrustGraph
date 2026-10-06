const AuthService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');
const { HTTP_STATUS } = require('../constants');

exports.signup = asyncHandler(async (req, res) => {
  const reqInfo = { ip: req.ip, userAgent: req.get('User-Agent') };
  const { user, token } = await AuthService.signup(req.body, reqInfo);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'User registered successfully.',
    data: { user, token },
  });
});

exports.login = asyncHandler(async (req, res) => {
  const reqInfo = { ip: req.ip, userAgent: req.get('User-Agent') };
  const { user, token } = await AuthService.login(req.body, reqInfo);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'User logged in successfully.',
    data: { user, token },
  });
});

exports.getMe = asyncHandler(async (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { user: req.user },
  });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const updatedUser = await AuthService.updateProfile(req.user._id, req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Profile information updated successfully.',
    data: { user: updatedUser },
  });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const reqInfo = { ip: req.ip, userAgent: req.get('User-Agent') };
  const result = await AuthService.changePassword(req.user._id, req.body, reqInfo);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: result.message,
    data: {
      token: result.token,
      lastPasswordChangeAt: result.lastPasswordChangeAt,
    },
  });
});

exports.updatePreferences = asyncHandler(async (req, res) => {
  const preferences = await AuthService.updatePreferences(req.user._id, req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Account preferences updated.',
    data: { preferences },
  });
});

exports.getLoginActivity = asyncHandler(async (req, res) => {
  const history = await AuthService.getLoginActivity(req.user._id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Login activity history retrieved.',
    data: { activity: history },
  });
});

exports.deleteAccount = asyncHandler(async (req, res) => {
  const reqInfo = { ip: req.ip, userAgent: req.get('User-Agent') };
  const result = await AuthService.deleteAccount(req.user._id, req.body, reqInfo);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: result.message,
  });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const { resetToken, email } = await AuthService.forgotPassword(req.body.email);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Password reset token generated.',
    data: {
      email,
      resetToken,
      instructions: 'Use this reset token within 10 minutes to reset your password.',
    },
  });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const { password } = req.body;

  const result = await AuthService.resetPassword(resetToken, password);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: result.message,
    data: { token: result.token },
  });
});

exports.getAllUsers = asyncHandler(async (req, res) => {
  const users = await AuthService.getAllUsers();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { users },
  });
});

exports.updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const reqInfo = { ip: req.ip, userAgent: req.get('User-Agent') };

  const { user, token } = await AuthService.updateUserRole(id, role, req.user, reqInfo);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: `User role successfully updated to ${user.role}.`,
    data: { user, ...(token && { token }) },
  });
});
