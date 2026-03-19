import { FieldValidator, RequestValidator, rules } from './validationUtils.js';

/**
 * Auth Module Validators
 */

/**
 * Login Validator
 */
export const createLoginValidator = () => {
  const schema = {
    username: new FieldValidator('username')
      .add('required', rules.required, 'Username is required')
      .add('minLength', rules.minLength(3), 'Username must be at least 3 characters'),

    password: new FieldValidator('password')
      .add('required', rules.required, 'Password is required')
      .add('minLength', rules.minLength(6), 'Password must be at least 6 characters'),
  };

  return new RequestValidator(schema);
};

/**
 * Register Validator
 */
export const createRegisterValidator = () => {
  const schema = {
    username: new FieldValidator('username')
      .add('required', rules.required, 'Username is required')
      .add('pattern', rules.username, 'Username must be 3-20 alphanumeric characters'),

    email: new FieldValidator('email')
      .add('required', rules.required, 'Email is required')
      .add('email', rules.email, 'Must be a valid email address'),

    password: new FieldValidator('password')
      .add('required', rules.required, 'Password is required')
      .add('minLength', rules.minLength(8), 'Password must be at least 8 characters'),

    passwordConfirm: new FieldValidator('passwordConfirm')
      .add('required', rules.required, 'Password confirmation is required'),
  };

  return new RequestValidator(schema);
};

/**
 * Change Password Validator
 */
export const createChangePasswordValidator = () => {
  const schema = {
    currentPassword: new FieldValidator('currentPassword')
      .add('required', rules.required, 'Current password is required'),

    newPassword: new FieldValidator('newPassword')
      .add('required', rules.required, 'New password is required')
      .add('minLength', rules.minLength(8), 'New password must be at least 8 characters'),

    confirmPassword: new FieldValidator('confirmPassword')
      .add('required', rules.required, 'Password confirmation is required'),
  };

  return new RequestValidator(schema);
};

/**
 * Refresh Token Validator
 */
export const createRefreshTokenValidator = () => {
  const schema = {
    token: new FieldValidator('token')
      .add('required', rules.required, 'Token is required'),
  };

  return new RequestValidator(schema);
};

export default {
  createLoginValidator,
  createRegisterValidator,
  createChangePasswordValidator,
  createRefreshTokenValidator,
};
