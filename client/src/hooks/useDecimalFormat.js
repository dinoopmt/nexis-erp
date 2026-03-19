import { useContext } from 'react';
import { CompanyContext } from '../context/CompanyContext';
import DecimalFormatService from '../services/DecimalFormatService';

/**
 * Custom Hook: useDecimalFormat
 * Provides company-aware decimal formatting functions
 * Uses the company's decimalPlaces setting automatically
 */
export const useDecimalFormat = () => {
  const context = useContext(CompanyContext);

  if (!context) {
    throw new Error('useDecimalFormat must be used within CompanyProvider');
  }

  const { company } = context;
  const decimalPlaces = company?.decimalPlaces || 2;
  const currency = company?.currency || 'AED';
  const countryCode = company?.countryCode || 'AE';

  return {
    /**
     * Format a number with company's decimal places
     */
    formatNumber: (amount) => DecimalFormatService.formatNumber(amount, decimalPlaces),

    /**
     * Format as currency with company's settings
     */
    formatCurrency: (amount, customCurrency = currency) =>
      DecimalFormatService.formatCurrency(amount, customCurrency, decimalPlaces),

    /**
     * Format as percentage with company's decimal places
     */
    formatPercentage: (value) => DecimalFormatService.formatPercentage(value, decimalPlaces),

    /**
     * Format for display in tables/reports
     */
    formatForDisplay: (amount, options = {}) =>
      DecimalFormatService.formatForDisplay(amount, {
        currency,
        decimalPlaces,
        ...options,
      }),

    /**
     * Parse user input
     */
    parseInput: (input) => DecimalFormatService.parseInput(input, decimalPlaces),

    /**
     * Validate decimal input
     */
    isValidDecimal: (input) => DecimalFormatService.isValidDecimal(input, decimalPlaces),

    /**
     * Round to company's decimal places
     */
    round: (amount) => DecimalFormatService.round(amount, decimalPlaces),

    /**
     * Sum array of amounts
     */
    sum: (amounts = []) => DecimalFormatService.sum(amounts, decimalPlaces),

    /**
     * Calculate average
     */
    average: (amounts = []) => DecimalFormatService.average(amounts, decimalPlaces),

    /**
     * Get validation regex for this company
     */
    getValidationRegex: () => DecimalFormatService.getValidationRegex(decimalPlaces),

    /**
     * Get decimal separator for company's currency
     */
    getDecimalSeparator: () => DecimalFormatService.getDecimalSeparator(currency),

    /**
     * Access raw service for advanced usage
     */
    service: DecimalFormatService,

    /**
     * Company settings info
     */
    config: {
      decimalPlaces,
      currency,
      countryCode,
    },

    /**
     * Direct access to decimal places (for country-based formatting)
     */
    decimalPlaces,

    /**
     * Direct access to currency code
     */
    currency,

    /**
     * Direct access to country code
     */
    countryCode,
  };
};

export default useDecimalFormat;


