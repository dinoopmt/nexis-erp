// Server-side helper exports
// This file organizes common helper functions for easy import

/**
 * Standard API Response Format
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Response message
 * @param {any} data - Response data
 * @returns {Object} Formatted response
 */
const apiResponse = (statusCode, message, data = null) => {
  return {
    statusCode,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Format validation error response
 * @param {string} field - Field name
 * @param {string} error - Error message
 * @returns {Object} Formatted error
 */
const formatValidationError = (field, error) => {
  return {
    field,
    error,
  };
};

/**
 * Extract numeric value safely
 * @param {any} value - Value to convert
 * @param {number} defaultValue - Default if conversion fails
 * @returns {number} Converted value
 */
const safeNumber = (value, defaultValue = 0) => {
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
};

/**
 * Round number to specific decimal places
 * @param {number} value - Number to round
 * @param {number} decimals - Number of decimal places
 * @returns {number} Rounded number
 */
const roundDecimal = (value, decimals = 2) => {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Check if value is valid (not null, not undefined, not empty string)
 * @param {any} value - Value to check
 * @returns {boolean} True if valid
 */
const isValidValue = (value) => {
  return value !== null && value !== undefined && value !== '';
};

module.exports = {
  apiResponse,
  formatValidationError,
  safeNumber,
  roundDecimal,
  generateId,
  isValidValue,
};
