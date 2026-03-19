import logger from '../../config/logger.js';

/**
 * Validation Rules - Common validation patterns
 */

export const rules = {
  // String validations
  string: (value) => typeof value === 'string',
  email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  phone: (value) => /^[0-9\s\-\+\(\)]{10,}$/.test(value),
  url: (value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  username: (value) => /^[a-zA-Z0-9_]{3,20}$/.test(value),
  password: (value) => value.length >= 8, // Min 8 chars
  strongPassword: (value) => {
    // At least 8 chars, 1 uppercase, 1 number, 1 special char
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(value);
  },

  // Number validations
  number: (value) => typeof value === 'number' && !isNaN(value),
  integer: (value) => Number.isInteger(value),
  positiveNumber: (value) => typeof value === 'number' && value > 0,
  negativeNumber: (value) => typeof value === 'number' && value < 0,
  percentage: (value) => typeof value === 'number' && value >= 0 && value <= 100,

  // Array validations
  array: (value) => Array.isArray(value),
  nonEmptyArray: (value) => Array.isArray(value) && value.length > 0,

  // Date validations
  date: (value) => {
    const date = new Date(value);
    return date instanceof Date && !isNaN(date);
  },
  futureDate: (value) => new Date(value) > new Date(),
  pastDate: (value) => new Date(value) < new Date(),

  // Length validations
  minLength: (min) => (value) => value && value.length >= min,
  maxLength: (max) => (value) => value && value.length <= max,
  betweenLength: (min, max) => (value) => value && value.length >= min && value.length <= max,

  // Range validations
  min: (min) => (value) => typeof value === 'number' && value >= min,
  max: (max) => (value) => typeof value === 'number' && value <= max,
  between: (min, max) => (value) => typeof value === 'number' && value >= min && value <= max,

  // Boolean
  boolean: (value) => typeof value === 'boolean',

  // Enum/Choice
  enum: (allowedValues) => (value) => allowedValues.includes(value),

  // Custom validation
  custom: (fn) => fn,

  // Null/Empty checks
  required: (value) => value !== null && value !== undefined && value !== '',
  notEmpty: (value) => value !== null && value !== undefined && value !== '',
  optional: () => true,
};

/**
 * Field Validator - Validates a single field
 */
export class FieldValidator {
  constructor(fieldName) {
    this.fieldName = fieldName;
    this.validations = [];
    this.errors = [];
  }

  // Add validation
  add(ruleName, rule, errorMessage) {
    this.validations.push({
      name: ruleName,
      fn: rule,
      message: errorMessage || `${this.fieldName} failed ${ruleName} validation`,
    });
    return this;
  }

  // Run all validations
  validate(value) {
    this.errors = [];

    for (const validation of this.validations) {
      try {
        const result = validation.fn(value);
        if (!result) {
          this.errors.push(validation.message);
        }
      } catch (error) {
        this.errors.push(`${this.fieldName} validation error: ${error.message}`);
      }
    }

    return this.errors.length === 0;
  }

  // Get errors
  getErrors() {
    return this.errors;
  }

  // Check if valid
  isValid() {
    return this.errors.length === 0;
  }
}

/**
 * Request Validator - Validates entire request body
 */
export class RequestValidator {
  constructor(schema) {
    this.schema = schema; // { fieldName: fieldValidator }
    this.errors = {};
  }

  /**
   * Validate request body against schema
   * @param {Object} data - Request body data
   * @returns {boolean} Is valid
   */
  validate(data) {
    this.errors = {};

    for (const [fieldName, validator] of Object.entries(this.schema)) {
      const value = data[fieldName];

      if (!validator.validate(value)) {
        this.errors[fieldName] = validator.getErrors();
      }
    }

    return Object.keys(this.errors).length === 0;
  }

  /**
   * Get all validation errors
   */
  getErrors() {
    return this.errors;
  }

  /**
   * Check if valid
   */
  isValid() {
    return Object.keys(this.errors).length === 0;
  }
}

/**
 * Validation Middleware Creator
 */
export const createValidationMiddleware = (validator) => {
  return (req, res, next) => {
    try {
      // Validate request body
      if (!validator.validate(req.body)) {
        const errors = validator.getErrors();

        logger.warn('Validation failed', {
          path: req.path,
          errors,
        });

        return res.status(400).json({
          success: false,
          status: 400,
          message: 'Validation failed',
          errors,
        });
      }

      // Add validated data to request
      req.validated = req.body;
      next();
    } catch (error) {
      logger.error('Validation middleware error', { error: error.message });

      res.status(500).json({
        success: false,
        status: 500,
        message: 'Validation error',
      });
    }
  };
};

/**
 * Sanitize Utilities
 */
export const sanitize = {
  // Trim whitespace
  trim: (value) => (typeof value === 'string' ? value.trim() : value),

  // Lowercase
  lowercase: (value) => (typeof value === 'string' ? value.toLowerCase() : value),

  // Uppercase
  uppercase: (value) => (typeof value === 'string' ? value.toUpperCase() : value),

  // Remove special characters
  removeSpecial: (value) => {
    if (typeof value !== 'string') return value;
    return value.replace(/[^a-zA-Z0-9\s]/g, '');
  },

  // Convert to number
  toNumber: (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  },

  // Convert to integer
  toInteger: (value) => {
    const num = parseInt(value, 10);
    return isNaN(num) ? null : num;
  },

  // Convert to boolean
  toBoolean: (value) => {
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === '1' || value === 1 || value === true;
  },

  // Truncate string
  truncate: (maxLength) => (value) => {
    if (typeof value !== 'string') return value;
    return value.substring(0, maxLength);
  },

  // Remove HTML tags
  stripHtml: (value) => {
    if (typeof value !== 'string') return value;
    return value.replace(/<[^>]*>/g, '');
  },

  // Escape HTML
  escapeHtml: (value) => {
    if (typeof value !== 'string') return value;
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return value.replace(/[&<>"']/g, (m) => map[m]);
  },
};

/**
 * Sanitize middleware
 */
export const sanitizeMiddleware = (fields) => {
  return (req, res, next) => {
    try {
      for (const field of fields) {
        if (req.body[field]) {
          req.body[field] = sanitize.trim(req.body[field]);
          req.body[field] = sanitize.stripHtml(req.body[field]);
        }
      }
      next();
    } catch (error) {
      logger.error('Sanitization error', { error: error.message });
      res.status(500).json({ success: false, message: 'Sanitization error' });
    }
  };
};

export default {
  rules,
  FieldValidator,
  RequestValidator,
  createValidationMiddleware,
  sanitize,
  sanitizeMiddleware,
};
