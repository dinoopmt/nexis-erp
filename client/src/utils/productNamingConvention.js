/**
 * productNamingConvention.js
 * Standardizes product naming with auto-capitalization, validation, and duplicate detection
 * 
 * Features:
 * - Title Case conversion (Each Word Capitalized)
 * - Validation rules (prevent lowercase, all caps)
 * - Duplicate name detection
 * - Store settings integration
 * - Customizable rules
 */

import axios from 'axios';
import { API_URL } from '../config/config';

/**
 * Naming Convention Rules
 */
export const NAMING_RULES = {
  TITLE_CASE: 'titleCase',      // Each Word Capitalized
  LOWERCASE: 'lowercase',        // all lowercase
  UPPERCASE: 'UPPERCASE',        // ALL UPPERCASE
  SENTENCE_CASE: 'sentenceCase', // First word capitalized only
};

/**
 * Convert product name to Title Case
 * Example: "apple iphone 14 pro" → "Apple Iphone 14 Pro"
 * OPTIMIZED: Caches split result to avoid redundant splitting
 */
export const toTitleCase = (name) => {
  if (!name || typeof name !== 'string') return '';
  
  const smallWords = ['and', 'or', 'in', 'on', 'at', 'the', 'a', 'an', 'to', 'by'];
  const words = name.toLowerCase().split(' ');
  const firstWord = words[0];
  
  return words
    .map((word, index) => {
      const isSmallWord = smallWords.includes(word.toLowerCase());
      
      if (isSmallWord && index !== 0) {
        return word.toLowerCase();
      }
      
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

/**
 * Check if name is all lowercase
 */
export const isAllLowercase = (name) => {
  if (!name) return false;
  return name === name.toLowerCase() && name.match(/[a-z]/);
};

/**
 * Check if name is all uppercase
 */
export const isAllUppercase = (name) => {
  if (!name) return false;
  return name === name.toUpperCase() && name.match(/[A-Z]/);
};

/**
 * Check if name is valid Title Case
 */
export const isTitleCase = (name) => {
  if (!name) return false;
  return name === toTitleCase(name);
};

/**
 * Validate product name against rules
 * Returns: { isValid: boolean, errors: string[], warnings: string[] }
 */
export const validateProductName = (name, options = {}) => {
  const {
    allowLowercase = false,
    allowAllCaps = false,
    allowSpecialChars = true,
    minLength = 2,
    maxLength = 100,
  } = options;

  const result = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  // ✅ Check if empty
  if (!name || name.trim() === '') {
    result.isValid = false;
    result.errors.push('Product name cannot be empty');
    return result;
  }

  const trimmedName = name.trim();

  // ✅ Check length
  if (trimmedName.length < minLength) {
    result.isValid = false;
    result.errors.push(`Product name must be at least ${minLength} characters`);
  }

  if (trimmedName.length > maxLength) {
    result.isValid = false;
    result.errors.push(`Product name must be at most ${maxLength} characters`);
  }

  // ✅ Check for all lowercase (violation)
  if (isAllLowercase(trimmedName)) {
    if (!allowLowercase) {
      result.isValid = false;
      result.errors.push('Product name cannot be all lowercase');
    } else {
      result.warnings.push('Product name is all lowercase (not recommended)');
    }
  }

  // ✅ Check for all uppercase (violation)
  if (isAllUppercase(trimmedName)) {
    if (!allowAllCaps) {
      result.isValid = false;
      result.errors.push('Product name cannot be all uppercase');
    } else {
      result.warnings.push('Product name is all uppercase (not recommended)');
    }
  }

  // ✅ Check for proper Title Case (warning if not)
  if (!isTitleCase(trimmedName) && !isAllLowercase(trimmedName) && !isAllUppercase(trimmedName)) {
    result.warnings.push(`Product name should follow Title Case. Suggested: "${toTitleCase(trimmedName)}"`);
  }

  // ✅ Check for special characters
  if (!allowSpecialChars && /[^\w\s-]/.test(trimmedName)) {
    result.isValid = false;
    result.errors.push('Product name contains invalid characters');
  }

  return result;
};

/**
 * Normalize product name to Title Case with trimming
 */
export const normalizeProductName = (name) => {
  if (!name || typeof name !== 'string') return '';
  return toTitleCase(name.trim());
};

/**
 * Check for duplicate product name (API call)
 * @param {string} productName - Name to check
 * @param {string} excludeProductId - Product ID to exclude from check (for edit mode)
 * @returns {Promise<{isDuplicate: boolean, similarProducts: Array}>}
 */
export const checkDuplicateProductName = async (productName, excludeProductId = null) => {
  try {
    const response = await axios.get(
      `${API_URL}/products/check-duplicate-name`,
      {
        params: {
          name: normalizeProductName(productName),
          excludeId: excludeProductId,
        },
      }
    );

    return {
      isDuplicate: response.data.isDuplicate,
      similarProducts: response.data.similarProducts || [],
    };
  } catch (error) {
    console.error('Error checking duplicate product name:', error);
    return {
      isDuplicate: false,
      similarProducts: [],
      error: error.message,
    };
  }
};

/**
 * 🚀 PERFORMANCE: Cache for store naming rules (prevents repeated API calls)
 */
let storeNamingRulesCache = null;
let rulesLastFetchTime = 0;
const RULES_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get naming convention rules from store settings
 * OPTIMIZED: Caches rules for 5 minutes to prevent repeated API calls
 * @returns {Promise<Object>} Store naming convention settings
 */
export const getStoreNamingRules = async () => {
  try {
    // ✅ Return cached rules if still valid
    if (storeNamingRulesCache && Date.now() - rulesLastFetchTime < RULES_CACHE_DURATION) {
      return storeNamingRulesCache;
    }

    const response = await axios.get(`${API_URL}/settings/naming-rules`);
    const rules = {
      enabled: response.data.enabled !== false,
      convention: response.data.convention || NAMING_RULES.TITLE_CASE,
      preventLowercase: response.data.preventLowercase !== false,
      preventAllCaps: response.data.preventAllCaps !== false,
      enforceOnSave: response.data.enforceOnSave !== false,
      checkDuplicates: response.data.checkDuplicates !== false,
    };

    // ✅ Store in cache
    storeNamingRulesCache = rules;
    rulesLastFetchTime = Date.now();

    return rules;
  } catch (error) {
    console.error('Error fetching naming rules:', error);
    
    // ✅ Return cached rules even if API fails
    if (storeNamingRulesCache) {
      return storeNamingRulesCache;
    }

    // Default settings if API fails and no cache
    const defaults = {
      enabled: true,
      convention: NAMING_RULES.TITLE_CASE,
      preventLowercase: true,
      preventAllCaps: true,
      enforceOnSave: true,
      checkDuplicates: true,
    };

    // Cache defaults too
    storeNamingRulesCache = defaults;
    rulesLastFetchTime = Date.now();

    return defaults;
  }
};

/**
 * Apply naming convention based on rules
 * @param {string} productName - Name to process
 * @param {Object} rules - Naming rules from store settings
 * @returns {string} Processed product name
 */
export const applyNamingConvention = (productName, rules = {}) => {
  const {
    convention = NAMING_RULES.TITLE_CASE,
    enabled = true,
  } = rules;

  if (!enabled) return productName;

  switch (convention) {
    case NAMING_RULES.TITLE_CASE:
      return toTitleCase(productName);
    case NAMING_RULES.LOWERCASE:
      return productName.toLowerCase();
    case NAMING_RULES.UPPERCASE:
      return productName.toUpperCase();
    case NAMING_RULES.SENTENCE_CASE:
      const words = productName.toLowerCase().split(' ');
      words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
      return words.join(' ');
    default:
      return productName;
  }
};

/**
 * Format validation error message for display
 */
export const getValidationErrorMessage = (validationResult) => {
  if (validationResult.isValid) return null;
  return validationResult.errors[0] || 'Invalid product name';
};

/**
 * Format validation warning message for display
 */
export const getValidationWarningMessage = (validationResult) => {
  if (validationResult.warnings.length === 0) return null;
  return validationResult.warnings[0];
};

export default {
  toTitleCase,
  isAllLowercase,
  isAllUppercase,
  isTitleCase,
  validateProductName,
  normalizeProductName,
  checkDuplicateProductName,
  getStoreNamingRules,
  applyNamingConvention,
  getValidationErrorMessage,
  getValidationWarningMessage,
  NAMING_RULES,
};
