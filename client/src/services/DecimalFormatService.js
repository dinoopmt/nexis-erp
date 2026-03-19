/**
 * DecimalFormatService - Global Decimal Formatting
 * Handles all decimal formatting based on company settings
 */

class DecimalFormatService {
  /**
   * Format a number with specified decimal places
   * @param {number} amount - The amount to format
   * @param {number} decimalPlaces - Number of decimal places (0-4)
   * @returns {string} Formatted number
   */
  static formatNumber(amount, decimalPlaces = 2) {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '0.' + '0'.repeat(Math.max(0, decimalPlaces));
    }

    return parseFloat(amount).toFixed(Math.min(decimalPlaces, 4));
  }

  /**
   * Format currency with decimal places
   * @param {number} amount - The amount to format
   * @param {string} currency - Currency code (AED, INR, OMR, etc.)
   * @param {number} decimalPlaces - Number of decimal places
   * @param {boolean} hideSymbol - Hide currency symbol (default: false)
   * @returns {string} Formatted currency
   */
  static formatCurrency(amount, currency = 'AED', decimalPlaces = 2, hideSymbol = false) {
    const formatted = this.formatNumber(amount, decimalPlaces);

    if (hideSymbol) {
      return formatted;
    }

    const currencySymbols = {
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

    const symbol = currencySymbols[currency] || currency;
    return `${symbol} ${formatted}`;
  }

  /**
   * Format percentage with decimal places
   * @param {number} value - The percentage value (0-100)
   * @param {number} decimalPlaces - Number of decimal places
   * @returns {string} Formatted percentage
   */
  static formatPercentage(value, decimalPlaces = 2) {
    const formatted = this.formatNumber(value, decimalPlaces);
    return `${formatted}%`;
  }

  /**
   * Get decimal symbol for currency
   * @param {string} currency - Currency code
   * @returns {string} Decimal separator (. or ,)
   */
  static getDecimalSeparator(currency = 'AED') {
    // Some countries use comma as decimal separator
    const commaCountries = ['DE', 'FR', 'IT', 'ES', 'PT'];
    return commaCountries.includes(currency) ? ',' : '.';
  }

  /**
   * Parse user input and return valid number
   * @param {string} input - User input string
   * @param {number} maxDecimals - Maximum decimal places allowed
   * @returns {number} Parsed number or 0
   */
  static parseInput(input, maxDecimals = 4) {
    if (!input || typeof input !== 'string') return 0;

    // Remove any non-numeric characters except . and -
    let cleaned = input.replace(/[^\d.\-]/g, '');

    // Handle multiple decimal points
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }

    const num = parseFloat(cleaned);
    if (isNaN(num)) return 0;

    // Limit decimal places
    return Math.round(num * Math.pow(10, maxDecimals)) / Math.pow(10, maxDecimals);
  }

  /**
   * Validate decimal input
   * @param {string} input - User input string
   * @param {number} maxDecimals - Maximum decimal places
   * @returns {boolean} True if valid
   */
  static isValidDecimal(input, maxDecimals = 4) {
    if (!input) return true; // Empty is valid
    const regex = new RegExp(`^-?\\d+(\\.\\d{1,${maxDecimals}})?$`);
    return regex.test(input.toString());
  }

  /**
   * Round amount to specified decimal places
   * @param {number} amount - The amount to round
   * @param {number} decimalPlaces - Number of decimal places
   * @returns {number} Rounded amount
   */
  static round(amount, decimalPlaces = 2) {
    const factor = Math.pow(10, decimalPlaces);
    return Math.round(amount * factor) / factor;
  }

  /**
   * Calculate sum with proper decimal handling
   * @param {number[]} amounts - Array of amounts
   * @param {number} decimalPlaces - Number of decimal places
   * @returns {number} Sum with proper rounding
   */
  static sum(amounts = [], decimalPlaces = 2) {
    const total = amounts.reduce((acc, val) => {
      const parsed = typeof val === 'string' ? parseFloat(val) : val;
      return acc + (isNaN(parsed) ? 0 : parsed);
    }, 0);

    return this.round(total, decimalPlaces);
  }

  /**
   * Calculate average with proper decimal handling
   * @param {number[]} amounts - Array of amounts
   * @param {number} decimalPlaces - Number of decimal places
   * @returns {number} Average with proper rounding
   */
  static average(amounts = [], decimalPlaces = 2) {
    if (amounts.length === 0) return 0;
    const total = this.sum(amounts, decimalPlaces + 2); // Add 2 for intermediate precision
    return this.round(total / amounts.length, decimalPlaces);
  }

  /**
   * Get default decimal places by country code
   * @param {string} countryCode - ISO country code
   * @returns {number} Default decimal places
   */
  static getDefaultDecimalsByCountry(countryCode) {
    const defaults = {
      AE: 2, // UAE
      OM: 3, // Oman
      IN: 2, // India
      US: 2,
      EU: 2,
      GB: 2,
      SA: 2,
      QA: 2,
      KW: 3,
      BH: 3,
    };

    return defaults[countryCode?.toUpperCase()] || 2;
  }

  /**
   * Format currency for display in tables/reports
   * @param {number} amount - Amount to format
   * @param {Object} options - Options: { currency, decimalPlaces, showSymbol }
   * @returns {string} Formatted display string
   */
  static formatForDisplay(amount, options = {}) {
    const {
      currency = 'AED',
      decimalPlaces = 2,
      showSymbol = true,
      abbreviate = false,
    } = options;

    let formatted = this.formatNumber(amount, decimalPlaces);

    // Abbreviate large numbers if requested
    if (abbreviate) {
      const num = parseFloat(formatted);
      if (num >= 1000000) {
        formatted = (num / 1000000).toFixed(decimalPlaces) + 'M';
      } else if (num >= 1000) {
        formatted = (num / 1000).toFixed(decimalPlaces) + 'K';
      }
    }

    if (showSymbol) {
      return this.formatCurrency(parseFloat(formatted), currency, decimalPlaces);
    }

    return formatted;
  }

  /**
   * Get validation regex for decimal input
   * @param {number} maxDecimals - Maximum decimal places
   * @returns {RegExp} Regex pattern for validation
   */
  static getValidationRegex(maxDecimals = 4) {
    return new RegExp(`^-?\\d+(\\.\\d{0,${maxDecimals}})?$`);
  }
}

export default DecimalFormatService;


