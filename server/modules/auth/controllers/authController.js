import authService from '../services/authService.js';
import { catchAsync } from '../../../config/errorHandler.js';
import logger from '../../../config/logger.js';

/**
 * AuthController - Handles HTTP requests for authentication
 * Business logic is delegated to authService
 */

/**
 * Login - Authenticate user and return JWT token
 */
export const login = catchAsync(async (req, res) => {
  const { username, password } = req.body;

  // Validate input
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password are required',
    });
  }

  // Call service
  const result = await authService.login(username, password);

  // Return success response
  res.status(200).json({
    success: true,
    token: result.token,
    user: result.user,
    message: 'Login successful',
  });
});

/**
 * Register - Create new user account
 */
export const register = catchAsync(async (req, res) => {
  const { username, password, email, role } = req.body;

  // Validate input
  if (!username || !password || !email) {
    return res.status(400).json({
      success: false,
      message: 'Username, password, and email are required',
    });
  }

  // Call service
  const result = await authService.register({ username, password, email, role });

  // Return success response
  res.status(201).json({
    success: true,
    data: result,
    message: 'User registered successfully',
  });
});

/**
 * Change Password
 */
export const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user?.userId; // From JWT middleware

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated',
    });
  }

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Current password and new password are required',
    });
  }

  // Call service
  const result = await authService.changePassword(userId, currentPassword, newPassword);

  // Return success response
  res.status(200).json({
    success: true,
    data: result,
    message: 'Password changed successfully',
  });
});

/**
 * Refresh Token
 */
export const refreshToken = catchAsync(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Token is required',
    });
  }

  // Call service
  const result = await authService.refreshToken(token);

  // Return success response
  res.status(200).json({
    success: true,
    data: result,
    message: 'Token refreshed successfully',
  });
});
   
