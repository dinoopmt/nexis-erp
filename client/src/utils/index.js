// Utility functions for the client application

/**
 * Get random background color
 * @returns {string} Tailwind background color class
 */
export const getRandomBG = () => {
  const colors = [
    "#025cca",
    "#f6b100",
    "#02ca3a",
    "#e63946",
  ];
  
  const Color = colors[Math.floor(Math.random() * colors.length)];
  return "bg-[" + Color + "]";
};

/**
 * Format date to readable format
 * @param {string|Date} date - Date to format
 * @param {string} format - Format pattern (optional)
 * @returns {string} Formatted date
 */
export const formatDate = (date, format = 'dd/MM/yyyy') => {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return format
    .replace('dd', day)
    .replace('MM', month)
    .replace('yyyy', year);
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format
 * @param {string} phone - Phone to validate
 * @returns {boolean} True if valid phone
 */
export const validatePhone = (phone) => {
  const phoneRegex = /^[0-9\s\-\+\(\)]{7,}$/;
  return phoneRegex.test(phone);
};

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length
 * @param {string} suffix - Suffix to add (default: '...')
 * @returns {string} Truncated text
 */
export const truncateText = (text, length = 50, suffix = '...') => {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + suffix;
};

/**
 * Deep clone an object
 * @param {object} obj - Object to clone
 * @returns {object} Cloned object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if value is empty (null, undefined, empty string, empty array/object)
 * @param {any} value - Value to check
 * @returns {boolean} True if empty
 */
export const isEmpty = (value) => {
  if (value === null || value === undefined || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Merge two objects (shallow merge)
 * @param {object} obj1 - First object
 * @param {object} obj2 - Second object
 * @returns {object} Merged object
 */
export const mergeObjects = (obj1, obj2) => {
  return { ...obj1, ...obj2 };
};

/**
 * Get value from nested object using dot notation
 * @param {object} obj - Object to search
 * @param {string} path - Dot notation path (e.g., 'user.profile.name')
 * @param {any} defaultValue - Default value if not found
 * @returns {any} Value at path or defaultValue
 */
export const getNestedValue = (obj, path, defaultValue = null) => {
  const keys = path.split('.');
  let value = obj;
  
  for (let key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return defaultValue;
    }
  }
  
  return value;
};

/**
 * Debounce a function
 * @param {function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {function} Debounced function
 */
export const debounce = (func, delay = 300) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Throttle a function
 * @param {function} func - Function to throttle
 * @param {number} delay - Delay in milliseconds
 * @returns {function} Throttled function
 */
export const throttle = (func, delay = 300) => {
  let shouldWait = false;
  return (...args) => {
    if (!shouldWait) {
      func(...args);
      shouldWait = true;
      setTimeout(() => {
        shouldWait = false;
      }, delay);
    }
  };
};

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export default {
  getRandomBG,
  formatDate,
  validateEmail,
  validatePhone,
  truncateText,
  deepClone,
  isEmpty,
  mergeObjects,
  getNestedValue,
  debounce,
  throttle,
  generateId,
};


