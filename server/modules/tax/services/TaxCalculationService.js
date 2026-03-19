import logger from '../../../config/logger.js';
import { AppError } from '../../../config/errorHandler.js';

/**
 * TaxCalculationService
 * Calculates taxes on sales and purchase transactions
 * Supports multiple countries: India (GST), UAE (VAT), Oman (VAT)
 */
class TaxCalculationService {
  /**
   * Calculate tax on invoice line item
   * @param {Object} itemData - { amount, country, taxType, taxSlabId, hsnCode, customerTaxType }
   * @returns {Promise<Object>} - Tax calculation breakdown
   */
  static async calculateLineTax(itemData) {
    try {
      const { amount, country, taxType, taxSlabId, customerTaxType } = itemData;

      if (!amount || !country || !taxType) {
        throw new Error('Amount, Country, and Tax Type are required');
      }

      if (amount < 0) {
        throw new Error('Amount cannot be negative');
      }

      // Validate country
      const validCountries = ['India', 'UAE', 'Oman'];
      if (!validCountries.includes(country)) {
        throw new Error(`Invalid country. Valid countries: ${validCountries.join(', ')}`);
      }

      let taxRate = 0;
      let taxAmount = 0;
      let taxBracket = null;

      // India GST Rates
      if (country === 'India') {
        // GST rates: 0%, 5%, 12%, 18%, 28%
        const gstRates = {
          '0': 0,
          '5': 5,
          '12': 12,
          '18': 18,
          '28': 28,
        };

        taxRate = gstRates[taxSlabId] || 18; // Default 18%
        taxBracket = `GST_${taxSlabId}%`;

        // Check exemption for unregistered customer
        if (customerTaxType === 'Unregistered') {
          // No GST for unregistered customers in some cases
          taxRate = 0;
        }
      }
      // UAE VAT
      else if (country === 'UAE') {
        taxRate = 5; // Standard VAT rate
        taxBracket = 'VAT_5%';
      }
      // Oman VAT
      else if (country === 'Oman') {
        taxRate = 5; // VAT rate
        taxBracket = 'VAT_5%';
      }

      taxAmount = (amount * taxRate) / 100;

      const result = {
        baseAmount: amount,
        taxRate,
        taxBracket,
        taxAmount: parseFloat(taxAmount.toFixed(2)),
        totalAmount: parseFloat((amount + taxAmount).toFixed(2)),
        country,
        customerTaxType,
      };

      logger.info('Line tax calculated successfully', {
        baseAmount: amount,
        taxRate,
        taxAmount: result.taxAmount,
        country,
      });

      return result;
    } catch (error) {
      logger.error('Error calculating line tax', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Calculate tax for invoice with multiple line items
   * @param {Array<Object>} invoiceLines - Array of { amount, taxSlabId, hsnCode }
   * @param {Object} invoiceData - { country, customerTaxType, invoiceType }
   * @returns {Promise<Object>} - Complete invoice tax calculation
   */
  static async calculateInvoiceTax(invoiceLines, invoiceData) {
    try {
      const { country, customerTaxType, invoiceType } = invoiceData;

      if (!Array.isArray(invoiceLines) || invoiceLines.length === 0) {
        throw new Error('Invoice lines array is required and must not be empty');
      }

      if (!country) {
        throw new Error('Country is required');
      }

      let totalBaseAmount = 0;
      let totalTaxAmount = 0;
      const taxBreakdown = {};
      const lineCalculations = [];

      // Calculate each line
      for (const line of invoiceLines) {
        const lineTax = await this.calculateLineTax({
          amount: line.amount,
          country,
          taxType: line.taxSlabId || 'Standard',
          taxSlabId: line.taxSlabId || '18',
          hsnCode: line.hsnCode,
          customerTaxType,
        });

        lineCalculations.push({
          ...line,
          ...lineTax,
        });

        totalBaseAmount += lineTax.baseAmount;
        totalTaxAmount += lineTax.taxAmount;

        // Breakdown by tax rate
        if (!taxBreakdown[lineTax.taxBracket]) {
          taxBreakdown[lineTax.taxBracket] = {
            count: 0,
            baseAmount: 0,
            taxAmount: 0,
          };
        }
        taxBreakdown[lineTax.taxBracket].count += 1;
        taxBreakdown[lineTax.taxBracket].baseAmount += lineTax.baseAmount;
        taxBreakdown[lineTax.taxBracket].taxAmount += lineTax.taxAmount;
      }

      // IGST vs CGST+SGST for India inter-state vs intra-state
      let cgstAmount = 0;
      let sgstAmount = 0;
      let igstAmount = 0;
      if (country === 'India') {
        if (invoiceType === 'Interstate') {
          igstAmount = totalTaxAmount;
        } else {
          cgstAmount = totalTaxAmount / 2;
          sgstAmount = totalTaxAmount / 2;
        }
      }

      const result = {
        invoiceType: invoiceType || 'Intrastate',
        country,
        customerTaxType,
        summary: {
          totalBaseAmount: parseFloat(totalBaseAmount.toFixed(2)),
          totalTaxAmount: parseFloat(totalTaxAmount.toFixed(2)),
          totalAmount: parseFloat((totalBaseAmount + totalTaxAmount).toFixed(2)),
          lineCount: invoiceLines.length,
        },
        taxBreakdown,
        lineCalculations,
      };

      // India specific
      if (country === 'India') {
        result.indiaTax = {
          cgst: parseFloat(cgstAmount.toFixed(2)),
          sgst: parseFloat(sgstAmount.toFixed(2)),
          igst: parseFloat(igstAmount.toFixed(2)),
        };
      }

      logger.info('Invoice tax calculated successfully', {
        country,
        totalAmount: result.summary.totalAmount,
        lineCount: invoiceLines.length,
      });

      return result;
    } catch (error) {
      logger.error('Error calculating invoice tax', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Calculate tax for purchase/cost
   * @param {Object} costData - { amount, country, vendorTaxType, invoiceType }
   * @returns {Promise<Object>} - Purchase tax calculation with input credit
   */
  static async calculatePurchaseTax(costData) {
    try {
      const { amount, country, vendorTaxType, invoiceType } = costData;

      if (!amount || !country) {
        throw new Error('Amount and Country are required');
      }

      if (amount < 0) {
        throw new Error('Amount cannot be negative');
      }

      let taxAmount = 0;
      let inputCreditEligible = false;

      // India GST
      if (country === 'India') {
        const gstRate = 18; // Default rate
        taxAmount = (amount * gstRate) / 100;
        // Input credit eligibility depends on vendor type
        inputCreditEligible = vendorTaxType === 'Registered';
      }
      // UAE VAT
      else if (country === 'UAE') {
        taxAmount = (amount * 5) / 100;
        inputCreditEligible = true;
      }
      // Oman VAT
      else if (country === 'Oman') {
        taxAmount = (amount * 5) / 100;
        inputCreditEligible = true;
      }

      const result = {
        baseAmount: amount,
        taxAmount: parseFloat(taxAmount.toFixed(2)),
        totalCost: parseFloat((amount + taxAmount).toFixed(2)),
        country,
        vendorTaxType,
        inputCreditEligible,
        inputCreditAmount: inputCreditEligible ? parseFloat(taxAmount.toFixed(2)) : 0,
      };

      logger.info('Purchase tax calculated successfully', {
        baseAmount: amount,
        taxAmount: result.taxAmount,
        inputCreditEligible,
        country,
      });

      return result;
    } catch (error) {
      logger.error('Error calculating purchase tax', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Calculate input tax credit (ITC) eligibility
   * @param {Object} itcData - { amount, country, documentType, vendorType }
   * @returns {Promise<Object>} - ITC calculation
   */
  static async calculateInputCredit(itcData) {
    try {
      const { amount, country, documentType, vendorType } = itcData;

      if (!amount || !country) {
        throw new Error('Amount and Country are required');
      }

      let eligible = false;
      let eligibilityReason = '';
      let creditAmount = 0;

      // India GST ITC Rules
      if (country === 'India') {
        // ITC eligible only on inward supply invoices from registered vendors
        if (documentType === 'Invoice' && vendorType === 'Registered') {
          eligible = true;
          creditAmount = amount;
          eligibilityReason = 'Inward supply from registered vendor';
        } else if (documentType === 'DebitNote') {
          eligible = true;
          creditAmount = amount;
          eligibilityReason = 'Debit note for returned goods';
        } else if (documentType === 'Import') {
          eligible = true;
          creditAmount = amount;
          eligibilityReason = 'Import with tax payment';
        } else {
          eligibilityReason = 'Not eligible - supply type not allowed for ITC';
        }

        // Capital goods ITC (5% per quarter, max 8 quarters)
        if (documentType === 'CapitalGoods') {
          eligible = true;
          creditAmount = (amount * 5) / 100; // 5% quarterly
          eligibilityReason = 'Capital goods - 5% per quarter';
        }
      }
      // UAE/Oman VAT ITC
      else {
        if (vendorType === 'Registered' && documentType === 'Invoice') {
          eligible = true;
          creditAmount = amount;
          eligibilityReason = 'Standard VAT invoice ITC';
        }
      }

      const result = {
        baseAmount: amount,
        country,
        documentType,
        vendorType,
        eligible,
        creditAmount: parseFloat((creditAmount || 0).toFixed(2)),
        eligibilityReason,
      };

      logger.info('Input tax credit calculated', {
        amount,
        eligible,
        creditAmount: result.creditAmount,
        country,
      });

      return result;
    } catch (error) {
      logger.error('Error calculating input credit', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Calculate tax on payment
   * @param {Object} paymentData - { paymentMethod, amount, country, recipientType }
   * @returns {Promise<Object>} - Payment tax (TDS if applicable)
   */
  static async calculatePaymentTax(paymentData) {
    try {
      const { paymentMethod, amount, country, recipientType } = paymentData;

      if (!amount || !country) {
        throw new Error('Amount and Country are required');
      }

      let tdsRate = 0;
      let tdsApplicable = false;

      // India TDS (Tax Deducted at Source)
      if (country === 'India') {
        // TDS on contractor payment
        if (recipientType === 'Contractor' && paymentMethod === 'Bank') {
          tdsRate = 2;
          tdsApplicable = true;
        }
        // TDS on vendor payment for goods
        else if (recipientType === 'Vendor' && amount > 50000) {
          tdsRate = 1;
          tdsApplicable = true;
        }
        // No TDS for regular payments
      }

      const tdsAmount = tdsApplicable ? (amount * tdsRate) / 100 : 0;
      const netPayment = amount - tdsAmount;

      const result = {
        grossAmount: amount,
        tdsRate,
        tdsApplicable,
        tdsAmount: parseFloat(tdsAmount.toFixed(2)),
        netPayment: parseFloat(netPayment.toFixed(2)),
        country,
        recipientType,
      };

      logger.info('Payment tax calculated', {
        amount,
        tdsApplicable,
        tdsAmount: result.tdsAmount,
        country,
      });

      return result;
    } catch (error) {
      logger.error('Error calculating payment tax', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Calculate tax for export invoice
   * @param {Object} exportData - { amount, country, hsn, customerCountry }
   * @returns {Promise<Object>} - Export tax calculation (zero-rated)
   */
  static async calculateExportTax(exportData) {
    try {
      const { amount, country, hsn, customerCountry } = exportData;

      if (!amount || !country || !customerCountry) {
        throw new Error('Amount, Country, and Customer Country are required');
      }

      if (country === customerCountry) {
        throw new Error('Cannot mark as export - customer is in same country');
      }

      // Exports are zero-rated in most countries
      const result = {
        baseAmount: amount,
        taxAmount: 0,
        totalAmount: amount,
        isExport: true,
        taxBracket: 'Export_ZeroRated',
        country,
        destinationCountry: customerCountry,
        hsn,
        eligibleForRefund: country === 'India', // IGST refund for exports
      };

      logger.info('Export tax calculated (zero-rated)', {
        amount,
        destination: customerCountry,
        eligibleForRefund: result.eligibleForRefund,
      });

      return result;
    } catch (error) {
      logger.error('Error calculating export tax', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Validate tax calculation for compliance
   * @param {Object} taxData - Tax calculation to validate
   * @returns {Object} - Validation result with warnings
   */
  static validateTaxCalculation(taxData) {
    const errors = [];
    const warnings = [];

    if (!taxData.baseAmount) {
      errors.push('Base amount is required');
    }
    if (!taxData.country) {
      errors.push('Country is required');
    }
    if (taxData.baseAmount < 0) {
      errors.push('Base amount cannot be negative');
    }
    if (taxData.taxAmount > taxData.baseAmount && taxData.taxAmount > 0) {
      warnings.push('Tax amount is unusually high relative to base amount');
    }
    if (taxData.country === 'India' && !taxData.customerTaxType) {
      warnings.push('Customer tax type not specified for India - defaulting to Unregistered');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export default TaxCalculationService;
