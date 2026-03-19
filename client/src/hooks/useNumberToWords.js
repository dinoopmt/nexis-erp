import { useContext } from 'react';
import { CompanyContext } from '../context/CompanyContext';
import NumberToWordsService from '../services/NumberToWordsService';

/**
 * Custom Hook: useNumberToWords
 * Converts numbers to words in English or Arabic (for UAE/Oman)
 * Supports: UAE (English/Arabic), Oman (English/Arabic), India (English)
 */
export const useNumberToWords = () => {
  const context = useContext(CompanyContext);

  if (!context) {
    throw new Error('useNumberToWords must be used within CompanyProvider');
  }

  const { company } = context;
  const countryCode = company?.countryCode || 'AE';
  const language = company?.language || 'en'; // 'en' or 'ar'

  return {
    /**
     * Convert number to words
     * @param {number} amount - The amount to convert
     * @param {string} currency - Currency name (optional, uses company currency)
     * @returns {string} Number in words
     */
    convertToWords: (amount, currency = company?.currency) =>
      NumberToWordsService.convertToWords(amount, countryCode, language, currency),

    /**
     * Convert number to words with currency
     * @param {number} amount - The amount to convert
     * @param {string} customCurrency - Custom currency name
     * @returns {string} Amount in words with currency
     */
    convertToWordsWithCurrency: (amount, customCurrency = company?.currency) =>
      NumberToWordsService.convertToWordsWithCurrency(
        amount,
        countryCode,
        language,
        customCurrency
      ),

    /**
     * Convert just the integer part
     * @param {number} amount
     * @returns {string} Integer part in words
     */
    convertIntegerToWords: (amount) =>
      NumberToWordsService.convertIntegerToWords(amount, countryCode, language),

    /**
     * Convert just the decimal/fraction part
     * @param {number} amount
     * @returns {string} Decimal part in words
     */
    convertDecimalToWords: (amount) =>
      NumberToWordsService.convertDecimalToWords(amount, countryCode, language),

    /**
     * Get currency words based on country
     * @param {string} currencyCode
     * @returns {object} { singular, plural }
     */
    getCurrencyWords: (currencyCode = company?.currency) =>
      NumberToWordsService.getCurrencyWords(currencyCode, countryCode, language),

    /**
     * Check if language conversion is available for country
     */
    isLanguageSupported: (lang) => NumberToWordsService.isLanguageSupported(countryCode, lang),

    /**
     * Get all supported currencies for the country
     */
    getSupportedCurrencies: () => NumberToWordsService.getSupportedCurrencies(countryCode),

    /**
     * Get current country code
     */
    getCountryCode: () => countryCode,

    /**
     * Get current language
     */
    getLanguage: () => language,
  };
};


