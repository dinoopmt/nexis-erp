/**
 * TaxService - Utility functions for tax calculations
 * Handles country-based tax calculations (VAT, GST, etc.)
 */

class TaxService {
  /**
   * Calculate tax amount based on base amount and tax rate
   * @param {number} baseAmount - Amount before tax
   * @param {number} taxRate - Tax rate percentage
   * @returns {number} Tax amount
   */
  static calculateTaxAmount(baseAmount, taxRate) {
    return (baseAmount * taxRate) / 100
  }

  /**
   * Calculate total amount including tax
   * @param {number} baseAmount - Amount before tax
   * @param {number} taxRate - Tax rate percentage
   * @returns {number} Total amount with tax
   */
  static calculateTotalWithTax(baseAmount, taxRate) {
    const taxAmount = this.calculateTaxAmount(baseAmount, taxRate)
    return baseAmount + taxAmount
  }

  /**
   * Calculate tax breakdown for DUAL tax systems (India GST)
   * Splits tax into CGST and SGST
   * @param {number} baseAmount - Amount before tax
   * @param {number} totalTaxRate - Total tax rate (e.g., 18)
   * @returns {object} { baseAmount, cgst, sgst, totalTax, total }
   */
  static calculateDualTax(baseAmount, totalTaxRate = 18) {
    const cgstRate = totalTaxRate / 2 // 9% from 18%
    const sgstRate = totalTaxRate / 2 // 9% from 18%

    const cgst = this.calculateTaxAmount(baseAmount, cgstRate)
    const sgst = this.calculateTaxAmount(baseAmount, sgstRate)
    const totalTax = cgst + sgst

    return {
      baseAmount: baseAmount,
      taxRate: totalTaxRate,
      cgst: cgst,
      cgstRate: cgstRate,
      sgst: sgst,
      sgstRate: sgstRate,
      totalTax: totalTax,
      total: baseAmount + totalTax,
    }
  }

  /**
   * Calculate tax breakdown for SINGLE tax systems (UAE/Oman VAT)
   * @param {number} baseAmount - Amount before tax
   * @param {number} taxRate - Tax rate (e.g., 5)
   * @returns {object} { baseAmount, vat, totalTax, total }
   */
  static calculateSingleTax(baseAmount, taxRate = 5) {
    const vat = this.calculateTaxAmount(baseAmount, taxRate)

    return {
      baseAmount: baseAmount,
      taxRate: taxRate,
      vat: vat,
      totalTax: vat,
      total: baseAmount + vat,
    }
  }

  /**
   * Calculate tax based on country and tax structure
   * @param {number} baseAmount - Amount before tax
   * @param {string} countryCode - Country code (AE, OM, IN)
   * @param {object} taxMaster - Tax master data
   * @returns {object} Tax breakdown object
   */
  static calculateTaxByCountry(baseAmount, countryCode, taxMaster) {
    if (!taxMaster || !Array.isArray(taxMaster)) {
      console.warn('Tax master not available for', countryCode)
      return null
    }

    // Get standard rate tax for this country
    const standardTax = taxMaster.find(
      (tax) => tax.countryCode === countryCode && tax.taxType === 'standard'
    )

    if (!standardTax) {
      console.warn('No standard tax found for', countryCode)
      return null
    }

    const totalRate = standardTax.totalRate

    // For India (DUAL), use CGST/SGST split
    if (countryCode === 'IN') {
      return this.calculateDualTax(baseAmount, totalRate)
    }

    // For UAE/Oman (SINGLE), use simple VAT
    return this.calculateSingleTax(baseAmount, totalRate)
  }

  /**
   * Format tax amount for display
   * @param {number} amount - Amount to format
   * @param {string} currency - Currency code (AED, INR, OMR)
   * @param {number} decimalPlaces - Number of decimal places (uses country-based config)
   * @returns {string} Formatted string
   */
  static formatCurrency(amount, currency = 'AED', decimalPlaces = 2) {
    const currencySymbols = {
      AED: 'د.إ',
      INR: '₹',
      OMR: 'ر.ع.',
      USD: '$',
      EUR: '€',
    }

    // Ensure decimalPlaces is within valid range
    const validDecimals = Math.min(Math.max(decimalPlaces, 0), 4);
    const symbol = currencySymbols[currency] || currency
    return `${symbol}${amount.toFixed(validDecimals)}`
  }

  /**
   * Get tax component names for display
   * @param {string} countryCode - Country code
   * @returns {array} Array of component names
   */
  static getTaxComponentNames(countryCode) {
    const components = {
      IN: ['CGST', 'SGST'],
      AE: ['VAT'],
      OM: ['VAT'],
    }
    return components[countryCode] || ['Tax']
  }

  /**
   * Check if country requires HSN code
   * @param {string} countryCode - Country code
   * @returns {boolean}
   */
  static requiresHSN(countryCode) {
    return countryCode === 'IN'
  }

  /**
   * Check if interstate tax applies (IGST in India)
   * @param {string} countryCode - Country code
   * @returns {boolean}
   */
  static hasInterstateTax(countryCode) {
    return countryCode === 'IN'
  }
}

export default TaxService


