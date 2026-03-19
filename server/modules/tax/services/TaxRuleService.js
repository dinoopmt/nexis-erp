import logger from '../../../config/logger.js';
import { AppError } from '../../../config/errorHandler.js';

/**
 * TaxRuleService
 * Manages tax rules, slab definitions, and tax rate configurations
 * Supports India GST, UAE VAT, and Oman VAT
 */
class TaxRuleService {
  /**
   * Create tax slab
   * @param {Object} slabData - { code, name, rate, country, applicableTo, effectiveDate }
   * @returns {Promise<Object>} - Created tax slab
   */
  static async createTaxSlab(slabData) {
    try {
      const { code, name, rate, country, applicableTo, effectiveDate } = slabData;

      if (!code || !name || rate === undefined || !country) {
        throw new Error('Code, Name, Rate, and Country are required');
      }

      if (rate < 0 || rate > 100) {
        throw new Error('Tax rate must be between 0 and 100');
      }

      const validCountries = ['India', 'UAE', 'Oman'];
      if (!validCountries.includes(country)) {
        throw new Error(`Invalid country. Valid countries: ${validCountries.join(', ')}`);
      }

      // Validate India GST rates
      if (country === 'India') {
        const validRates = [0, 5, 12, 18, 28];
        if (!validRates.includes(rate)) {
          throw new Error(`Invalid GST rate for India. Valid rates: ${validRates.join(', ')}`);
        }
      }

      // Check if slab already exists
      const exists = await this.getTaxSlabByCode(code, country);
      if (exists) {
        const err = new Error('Tax slab code already exists for this country');
        err.status = 409;
        throw err;
      }

      // In real implementation, save to database
      const slab = {
        code,
        name,
        rate,
        country,
        applicableTo: applicableTo || 'All', // All, Products, Services
        effectiveDate: effectiveDate || new Date(),
        status: 'Active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      logger.info('Tax slab created successfully', {
        code,
        rate,
        country,
        applicableTo,
      });

      return slab;
    } catch (error) {
      logger.error('Error creating tax slab', { error: error.message });
      const err = error.status ? error : new Error(error.message);
      if (!err.status) err.status = 400;
      throw err;
    }
  }

  /**
   * Get tax slab by code
   * @param {string} code - Slab code
   * @param {string} country - Country code
   * @returns {Promise<Object>} - Tax slab details
   */
  static async getTaxSlabByCode(code, country) {
    try {
      if (!code || !country) {
        throw new Error('Code and Country are required');
      }

      // In real implementation, fetch from database
      logger.info('Tax slab retrieved by code', { code, country });

      return {
        code,
        name: 'SGST_18',
        rate: 18,
        country,
        applicableTo: 'All',
        status: 'Active',
      };
    } catch (error) {
      logger.error('Error retrieving tax slab by code', { error: error.message, code, country });
      const err = new Error(error.message);
      err.status = 404;
      throw err;
    }
  }

  /**
   * Get all tax slabs for country
   * @param {string} country - Country code
   * @param {Object} filters - { applicableTo, status }
   * @returns {Promise<Array>} - Tax slabs
   */
  static async getTaxSlabsByCountry(country, filters = {}) {
    try {
      const { applicableTo, status = 'Active' } = filters;

      if (!country) {
        throw new Error('Country is required');
      }

      // In real implementation, query database
      let slabs = [];

      if (country === 'India') {
        slabs = [
          { code: 'GST_0', name: '0% GST', rate: 0, country, applicableTo: 'Exempted' },
          { code: 'GST_5', name: '5% GST', rate: 5, country, applicableTo: 'All' },
          { code: 'GST_12', name: '12% GST', rate: 12, country, applicableTo: 'All' },
          { code: 'GST_18', name: '18% GST', rate: 18, country, applicableTo: 'All' },
          { code: 'GST_28', name: '28% GST', rate: 28, country, applicableTo: 'All' },
        ];
      } else if (country === 'UAE') {
        slabs = [{ code: 'VAT_5', name: '5% VAT', rate: 5, country, applicableTo: 'All' }];
      } else if (country === 'Oman') {
        slabs = [{ code: 'VAT_5', name: '5% VAT', rate: 5, country, applicableTo: 'All' }];
      }

      if (applicableTo) {
        slabs = slabs.filter((slab) => slab.applicableTo === applicableTo);
      }

      slabs = slabs.filter((slab) => slab.status === status || !slab.status);

      logger.info('Tax slabs retrieved for country', { country, count: slabs.length });

      return slabs;
    } catch (error) {
      logger.error('Error retrieving tax slabs', { error: error.message, country });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Create tax rule for product category
   * @param {Object} ruleData - { category, taxSlabId, country, exempted, conditions }
   * @returns {Promise<Object>} - Created tax rule
   */
  static async createTaxRule(ruleData) {
    try {
      const { category, taxSlabId, country, exempted, conditions } = ruleData;

      if (!category || !country) {
        throw new Error('Category and Country are required');
      }

      if (!taxSlabId && !exempted) {
        throw new Error('Either Tax Slab ID or Exempted flag must be provided');
      }

      // In real implementation, save to database
      const rule = {
        category,
        taxSlabId: taxSlabId || null,
        country,
        exempted: exempted || false,
        conditions: conditions || {},
        status: 'Active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      logger.info('Tax rule created successfully', {
        category,
        country,
        taxSlabId,
        exempted,
      });

      return rule;
    } catch (error) {
      logger.error('Error creating tax rule', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get tax rule for product category
   * @param {string} category - Product category
   * @param {string} country - Country code
   * @returns {Promise<Object>} - Tax rule
   */
  static async getTaxRuleForCategory(category, country) {
    try {
      if (!category || !country) {
        throw new Error('Category and Country are required');
      }

      // In real implementation, fetch from database with fallback to default
      logger.info('Tax rule retrieved for category', { category, country });

      return {
        category,
        country,
        taxSlabId: 'GST_18',
        taxRate: 18,
        exempted: false,
        status: 'Active',
      };
    } catch (error) {
      logger.error('Error retrieving tax rule', { error: error.message, category, country });
      const err = new Error(error.message);
      err.status = 404;
      throw err;
    }
  }

  /**
   * Get all tax rules for country
   * @param {string} country - Country code
   * @param {Object} filters - { category, status }
   * @returns {Promise<Array>} - Tax rules
   */
  static async getTaxRulesByCountry(country, filters = {}) {
    try {
      const { category, status = 'Active' } = filters;

      if (!country) {
        throw new Error('Country is required');
      }

      // In real implementation, query database
      const rules = [
        { category: 'Electronics', country, taxSlabId: 'GST_18', taxRate: 18 },
        { category: 'Groceries', country, taxSlabId: 'GST_5', taxRate: 5 },
        { category: 'Medicines', country, taxSlabId: 'GST_0', taxRate: 0, exempted: true },
        { category: 'Luxury', country, taxSlabId: 'GST_28', taxRate: 28 },
      ];

      let filtered = rules.filter((rule) => rule.country === country);
      if (category) {
        filtered = filtered.filter((rule) => rule.category === category);
      }

      logger.info('Tax rules retrieved for country', { country, count: filtered.length });

      return filtered;
    } catch (error) {
      logger.error('Error retrieving tax rules', { error: error.message, country });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Update tax slab
   * @param {string} slabId - Slab ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object>} - Updated tax slab
   */
  static async updateTaxSlab(slabId, updateData) {
    try {
      if (!slabId) {
        throw new Error('Tax Slab ID is required');
      }

      if (updateData.rate !== undefined && (updateData.rate < 0 || updateData.rate > 100)) {
        throw new Error('Tax rate must be between 0 and 100');
      }

      // In real implementation, update in database
      const updated = {
        slabId,
        ...updateData,
        updatedAt: new Date(),
      };

      logger.info('Tax slab updated successfully', {
        slabId,
        fields: Object.keys(updateData),
      });

      return updated;
    } catch (error) {
      logger.error('Error updating tax slab', { error: error.message, slabId });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Deactivate tax slab
   * @param {string} slabId - Slab ID
   * @returns {Promise<Object>} - Deactivated slab
   */
  static async deactivateTaxSlab(slabId) {
    try {
      if (!slabId) {
        throw new Error('Tax Slab ID is required');
      }

      // In real implementation, update status in database
      const deactivated = {
        slabId,
        status: 'Inactive',
        deactivatedAt: new Date(),
      };

      logger.info('Tax slab deactivated successfully', { slabId });

      return deactivated;
    } catch (error) {
      logger.error('Error deactivating tax slab', { error: error.message, slabId });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get applicable tax rate for product
   * @param {string} productId - Product ID
   * @param {string} country - Country code
   * @param {string} customerTaxType - Customer tax type
   * @returns {Promise<Object>} - Applicable tax rate
   */
  static async getApplicableTaxRate(productId, country, customerTaxType) {
    try {
      if (!productId || !country) {
        throw new Error('Product ID and Country are required');
      }

      // In real implementation, fetch from database with HSN lookup
      let baseRate = 18; // Default for India
      let actualRate = baseRate;
      let reason = 'Standard GST rate';

      // Adjust for customer tax type
      if (customerTaxType === 'Unregistered' && country === 'India') {
        actualRate = 0;
        reason = 'Unregistered customer - no GST';
      } else if (customerTaxType === 'Non-resident' && country === 'India') {
        actualRate = 0;
        reason = 'Non-resident supply - no GST';
      } else if (customerTaxType === 'SEZ' && country === 'India') {
        actualRate = 0;
        reason = 'SEZ supply - exempted';
      }

      const result = {
        productId,
        country,
        baseRate,
        actualRate,
        reason,
        applicable: true,
      };

      logger.info('Applicable tax rate retrieved', {
        productId,
        country,
        actualRate,
      });

      return result;
    } catch (error) {
      logger.error('Error retrieving applicable tax rate', {
        error: error.message,
        productId,
        country,
      });
      const err = new Error(error.message);
      err.status = 404;
      throw err;
    }
  }

  /**
   * Get tax rate change history
   * @param {string} country - Country code
   * @param {Object} filters - { fromDate, toDate }
   * @returns {Promise<Array>} - Tax rate history
   */
  static async getTaxRateHistory(country, filters = {}) {
    try {
      const { fromDate, toDate } = filters;

      if (!country) {
        throw new Error('Country is required');
      }

      // In real implementation, query database
      const history = [
        {
          country,
          slabCode: 'GST_18',
          fromDate: '2017-07-01',
          toDate: new Date().toISOString().split('T')[0],
          rate: 18,
          status: 'Current',
        },
        {
          country,
          slabCode: 'GST_5',
          fromDate: '2017-07-01',
          toDate: new Date().toISOString().split('T')[0],
          rate: 5,
          status: 'Current',
        },
      ];

      logger.info('Tax rate history retrieved', { country, records: history.length });

      return history;
    } catch (error) {
      logger.error('Error retrieving tax rate history', { error: error.message, country });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Validate tax rule data
   * @param {Object} ruleData - Rule data to validate
   * @returns {Object} - Validation result
   */
  static validateTaxRuleData(ruleData) {
    const errors = [];

    if (!ruleData.category) {
      errors.push('Category is required');
    }
    if (!ruleData.country) {
      errors.push('Country is required');
    }
    if (!ruleData.taxSlabId && !ruleData.exempted) {
      errors.push('Either tax slab ID or exempted flag must be provided');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default TaxRuleService;
