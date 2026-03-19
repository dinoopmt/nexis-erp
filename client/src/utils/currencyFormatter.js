/**
 * Currency Formatter Utility
 * Handles country-based decimal formatting for all currencies
 * 
 * Usage:
 * import { formatCurrencyByCountry } from '@/utils/currencyFormatter';
 * 
 * const formatted = formatCurrencyByCountry(1234.5, 'AED', 'AE');
 * // Returns: "د.إ 1234.50"
 */

// Country to decimal places mapping
const COUNTRY_DECIMAL_CONFIG = {
  AE: { currency: 'AED', symbol: 'د.إ', decimals: 2 },
  OM: { currency: 'OMR', symbol: 'ر.ع.', decimals: 3 },
  IN: { currency: 'INR', symbol: '₹', decimals: 2 },
  US: { currency: 'USD', symbol: '$', decimals: 2 },
  EU: { currency: 'EUR', symbol: '€', decimals: 2 },
  UK: { currency: 'GBP', symbol: '£', decimals: 2 },
  SA: { currency: 'SAR', symbol: 'ر.س', decimals: 2 },
};

const CURRENCY_SYMBOLS = {
  AED: 'د.إ',
  OMR: 'ر.ع.',
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  SAR: 'ر.س',
  QAR: 'ر.ق',
  KWD: 'd.k',
  BHD: 'd.b',
};

/**
 * Format currency amount with country-based decimal places
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (AED, INR, OMR, etc.)
 * @param {number} decimalPlaces - Decimal places (defaults to 2)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'AED', decimalPlaces = 2) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return `${CURRENCY_SYMBOLS[currency] || currency} 0.${'0'.repeat(decimalPlaces)}`;
  }

  const validDecimals = Math.min(Math.max(decimalPlaces, 0), 4);
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const formatted = parseFloat(amount).toFixed(validDecimals);
  return `${symbol} ${formatted}`;
};

/**
 * Format currency by country code
 * @param {number} amount - Amount to format
 * @param {string} countryCode - Country code (AE, IN, OM, etc.)
 * @returns {string} Formatted currency with country-specific decimals
 */
export const formatCurrencyByCountry = (amount, countryCode = 'AE') => {
  const config = COUNTRY_DECIMAL_CONFIG[countryCode] || COUNTRY_DECIMAL_CONFIG.AE;
  return formatCurrency(amount, config.currency, config.decimals);
};

/**
 * Get decimal places for a country
 * @param {string} countryCode - Country code
 * @returns {number} Number of decimal places
 */
export const getCountryDecimals = (countryCode = 'AE') => {
  const config = COUNTRY_DECIMAL_CONFIG[countryCode] || COUNTRY_DECIMAL_CONFIG.AE;
  return config.decimals;
};

/**
 * Get currency code for a country
 * @param {string} countryCode - Country code
 * @returns {string} Currency code
 */
export const getCountryCurrency = (countryCode = 'AE') => {
  const config = COUNTRY_DECIMAL_CONFIG[countryCode] || COUNTRY_DECIMAL_CONFIG.AE;
  return config.currency;
};

/**
 * Format as currency display (for tables, reports, etc.)
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @param {number} decimalPlaces - Decimal places for display
 * @returns {string} Formatted string with just the number (no currency symbol)
 */
export const formatNumberWithDecimals = (amount, decimalPlaces = 2) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '0.' + '0'.repeat(decimalPlaces);
  }

  const validDecimals = Math.min(Math.max(decimalPlaces, 0), 4);
  return parseFloat(amount).toFixed(validDecimals);
};

export default {
  formatCurrency,
  formatCurrencyByCountry,
  getCountryDecimals,
  getCountryCurrency,
  formatNumberWithDecimals,
};


