import express from 'express';
import { login, register, changePassword, refreshToken } from '../controllers/authController.js';
import { sanitizeMiddleware, createValidationMiddleware } from '../../../middleware/validators/validationUtils.js';
import authValidators from '../../../middleware/validators/authValidators.js';

const router = express.Router();

/**
 * Validation Middleware Setup
 */
const loginValidator = authValidators.createLoginValidator();
const registerValidator = authValidators.createRegisterValidator();
const changePasswordValidator = authValidators.createChangePasswordValidator();
const refreshTokenValidator = authValidators.createRefreshTokenValidator();

// ================= LOGIN =================
router.post(
  '/login',
  sanitizeMiddleware(['username', 'password']),
  createValidationMiddleware(loginValidator),
  login
);

// ================= REGISTER =================
router.post(
  '/register',
  sanitizeMiddleware(['username', 'email', 'password', 'passwordConfirm']),
  createValidationMiddleware(registerValidator),
  register
);

// ================= CHANGE PASSWORD =================
router.post(
  '/change-password',
  sanitizeMiddleware(['currentPassword', 'newPassword', 'confirmPassword']),
  createValidationMiddleware(changePasswordValidator),
  changePassword
);

// ================= REFRESH TOKEN =================
router.post(
  '/refresh-token',
  createValidationMiddleware(refreshTokenValidator),
  refreshToken
);

export default router;