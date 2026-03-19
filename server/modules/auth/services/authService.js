import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import environment from '../../../config/environment.js';
import logger from '../../../config/logger.js';
import User from '../../../Models/User.js';

/**
 * AuthService - Handles all authentication business logic
 * This is separated from the controller to follow separation of concerns
 */

class AuthService {
  /**
   * Authenticate user with username and password
   * @param {string} username - User's username
   * @param {string} password - User's password
   * @returns {Promise<{token: string, user: Object}>} JWT token and user info
   * @throws {Error} If authentication fails
   */
  async login(username, password) {
    try {
      logger.debug('Login attempt', { username });

      // Validate input
      if (!username || !password) {
        const error = new Error('Username and password are required');
        error.status = 400;
        throw error;
      }

      // Find user by username
      const user = await User.findOne({ username });

      if (!user) {
        logger.warn('Login failed - user not found', { username });
        const error = new Error('Invalid username or password');
        error.status = 401;
        throw error;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        logger.warn('Login failed - invalid password', { username });
        const error = new Error('Invalid username or password');
        error.status = 401;
        throw error;
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user._id,
          username: user.username,
          role: user.role,
        },
        environment.JWT_SECRET,
        { expiresIn: environment.JWT_EXPIRE }
      );

      logger.info('User logged in successfully', { userId: user._id, username: user.username });

      return {
        token,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      };
    } catch (error) {
      logger.error('Login service error', { error: error.message });
      throw error;
    }
  }

  /**
   * Register new user
   * @param {Object} userData - User data {username, password, email, role}
   * @returns {Promise<{token: string, user: Object}>} JWT token and user info
   * @throws {Error} If registration fails
   */
  async register(userData) {
    try {
      const { username, password, email, role = 'user' } = userData;

      // Validate input
      if (!username || !password || !email) {
        const error = new Error('Username, password, and email are required');
        error.status = 400;
        throw error;
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ username }, { email }],
      });

      if (existingUser) {
        const error = new Error('Username or email already exists');
        error.status = 409;
        throw error;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user
      const newUser = new User({
        username,
        email,
        password: hashedPassword,
        role,
      });

      await newUser.save();

      // Generate token
      const token = jwt.sign(
        {
          userId: newUser._id,
          username: newUser.username,
          role: newUser.role,
        },
        environment.JWT_SECRET,
        { expiresIn: environment.JWT_EXPIRE }
      );

      logger.info('User registered successfully', { userId: newUser._id, username });

      return {
        token,
        user: {
          _id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
        },
      };
    } catch (error) {
      logger.error('Register service error', { error: error.message });
      throw error;
    }
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token to verify
   * @returns {Promise<Object>} Decoded token payload
   * @throws {Error} If token is invalid
   */
  async verifyToken(token) {
    try {
      if (!token) {
        const error = new Error('Token is required');
        error.status = 401;
        throw error;
      }

      const decoded = jwt.verify(token, environment.JWT_SECRET);
      return decoded;
    } catch (error) {
      logger.warn('Token verification failed', { error: error.message });
      const err = new Error('Invalid or expired token');
      err.status = 401;
      throw err;
    }
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Success message
   * @throws {Error} If password change fails
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId);

      if (!user) {
        const error = new Error('User not found');
        error.status = 404;
        throw error;
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

      if (!isPasswordValid) {
        const error = new Error('Current password is incorrect');
        error.status = 401;
        throw error;
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      await user.save();

      logger.info('Password changed successfully', { userId });

      return { message: 'Password changed successfully' };
    } catch (error) {
      logger.error('Change password service error', { error: error.message });
      throw error;
    }
  }

  /**
   * Refresh JWT token
   * @param {string} oldToken - Old JWT token
   * @returns {Promise<{token: string}>} New JWT token
   * @throws {Error} If token refresh fails
   */
  async refreshToken(oldToken) {
    try {
      const decoded = jwt.verify(oldToken, environment.JWT_SECRET, {
        ignoreExpiration: true,
      });

      const user = await User.findById(decoded.userId);

      if (!user || user.isDeleted) {
        const error = new Error('User not found');
        error.status = 404;
        throw error;
      }

      const newToken = jwt.sign(
        {
          userId: user._id,
          username: user.username,
          role: user.role,
        },
        environment.JWT_SECRET,
        { expiresIn: environment.JWT_EXPIRE }
      );

      logger.info('Token refreshed successfully', { userId: user._id });

      return { token: newToken };
    } catch (error) {
      logger.error('Refresh token service error', { error: error.message });
      const err = new Error('Token refresh failed');
      err.status = 401;
      throw err;
    }
  }
}

export default new AuthService();
