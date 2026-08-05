const AuthService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');
const { HTTP_STATUS, RESPONSE_MESSAGES } = require('../constants');

/**
 * Auth Controller Handling HTTP Requests & Standardized Responses
 */

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

exports.forgotPassword = asyncHandler(async (req, res) => {
  const { resetToken, email } = await AuthService.forgotPassword(req.body.email);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Password reset token generated.',
    data: {
      email,
      resetToken, // In production, this token is sent via Email service (Nodemailer/SendGrid)
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

exports.getMe = asyncHandler(async (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { user: req.user },
  });
});
