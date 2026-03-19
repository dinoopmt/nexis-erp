import logger from '../../../config/logger.js';
import { AppError } from '../../../config/errorHandler.js';

/**
 * DeductionService
 * Manages tax deductions and exemptions
 * Supports standard deductions, special deductions, and exemptions
 */
class DeductionService {
  /**
   * Create tax deduction policy
   * @param {Object} deductionData - { code, name, deductionType, amount, country, applicableTo }
   * @returns {Promise<Object>} - Created deduction policy
   */
  static async createDeductionPolicy(deductionData) {
    try {
      const { code, name, deductionType, amount, country, applicableTo } = deductionData;

      if (!code || !name || !deductionType || !country) {
        throw new Error('Code, Name, Deduction Type, and Country are required');
      }

      if (amount !== undefined && amount < 0) {
        throw new Error('Deduction amount cannot be negative');
      }

      const validTypes = ['Standard', 'Special', 'Exemption', 'Relief', 'CostIllustration'];
      if (!validTypes.includes(deductionType)) {
        throw new Error(`Invalid deduction type. Valid types: ${validTypes.join(', ')}`);
      }

      // Check if code already exists
      const exists = await this.getDeductionPolicyByCode(code);
      if (exists) {
        const err = new Error('Deduction policy code already exists');
        err.status = 409;
        throw err;
      }

      // In real implementation, save to database
      const policy = {
        code,
        name,
        deductionType,
        amount: amount || 0,
        country,
        applicableTo: applicableTo || 'General', // General, Agriculture, Manufacturing, Services
        status: 'Active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      logger.info('Deduction policy created successfully', {
        code,
        name,
        deductionType,
        amount,
        country,
      });

      return policy;
    } catch (error) {
      logger.error('Error creating deduction policy', { error: error.message });
      const err = error.status ? error : new Error(error.message);
      if (!err.status) err.status = 400;
      throw err;
    }
  }

  /**
   * Get deduction policy by code
   * @param {string} code - Policy code
   * @returns {Promise<Object>} - Deduction policy
   */
  static async getDeductionPolicyByCode(code) {
    try {
      if (!code) {
        throw new Error('Deduction policy code is required');
      }

      // In real implementation, fetch from database
      logger.info('Deduction policy retrieved by code', { code });

      return {
        code,
        name: 'COGS Deduction',
        deductionType: 'Standard',
        amount: 40,
        applicableTo: 'General',
        status: 'Active',
      };
    } catch (error) {
      logger.error('Error retrieving deduction policy', { error: error.message, code });
      const err = new Error(error.message);
      err.status = 404;
      throw err;
    }
  }

  /**
   * Get all deduction policies for country
   * @param {string} country - Country code
   * @param {Object} filters - { deductionType, applicableTo, status }
   * @returns {Promise<Array>} - Deduction policies
   */
  static async getDeductionPoliciesByCountry(country, filters = {}) {
    try {
      const { deductionType, applicableTo, status = 'Active' } = filters;

      if (!country) {
        throw new Error('Country is required');
      }

      // In real implementation, query database
      let policies = [
        {
          code: 'STD_001',
          name: 'Standard COGS Deduction',
          deductionType: 'Standard',
          amount: 40,
          country,
          applicableTo: 'General',
          status,
        },
        {
          code: 'AGR_001',
          name: 'Agriculture Income Deduction',
          deductionType: 'Special',
          amount: 60,
          country,
          applicableTo: 'Agriculture',
          status,
        },
        {
          code: 'EXE_001',
          name: 'Educational Institution Exemption',
          deductionType: 'Exemption',
          amount: 100,
          country,
          applicableTo: 'General',
          status,
        },
      ];

      if (deductionType) {
        policies = policies.filter((p) => p.deductionType === deductionType);
      }
      if (applicableTo) {
        policies = policies.filter((p) => p.applicableTo === applicableTo);
      }

      logger.info('Deduction policies retrieved for country', { country, count: policies.length });

      return policies;
    } catch (error) {
      logger.error('Error retrieving deduction policies', { error: error.message, country });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Calculate deduction amount
   * @param {Object} deductionData - { grossIncome, deductionPolicyId, country }
   * @returns {Promise<Object>} - Deduction calculation
   */
  static async calculateDeductionAmount(deductionData) {
    try {
      const { grossIncome, deductionPolicyId, country } = deductionData;

      if (!grossIncome || !deductionPolicyId) {
        throw new Error('Gross Income and Deduction Policy ID are required');
      }

      if (grossIncome < 0) {
        throw new Error('Gross income cannot be negative');
      }

      // In real implementation, fetch policy from database
      const policy = {
        code: deductionPolicyId,
        deductionType: 'Standard',
        rate: 40, // 40% standard deduction
      };

      // Calculate deduction
      let deductionAmount = 0;
      let deductionType = 'Percentage';

      if (policy.deductionType === 'Standard') {
        deductionAmount = (grossIncome * policy.rate) / 100;
      } else if (policy.deductionType === 'Fixed') {
        deductionAmount = policy.rate; // Fixed amount
        deductionType = 'Fixed';
      }

      // Cap deduction if needed (varies by country)
      if (country === 'India' && deductionAmount > grossIncome * 0.5) {
        deductionAmount = grossIncome * 0.5; // Max 50%
      }

      const result = {
        grossIncome,
        deductionPolicy: policy.code,
        deductionType,
        deductionRate: policy.rate,
        deductionAmount: parseFloat(deductionAmount.toFixed(2)),
        netIncome: parseFloat((grossIncome - deductionAmount).toFixed(2)),
        country,
      };

      logger.info('Deduction calculated successfully', {
        grossIncome,
        deductionAmount: result.deductionAmount,
        netIncome: result.netIncome,
      });

      return result;
    } catch (error) {
      logger.error('Error calculating deduction', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Apply exemption to transaction
   * @param {Object} exemptionData - { transactionId, exemptionType, reason, approverName }
   * @returns {Promise<Object>} - Applied exemption
   */
  static async applyExemption(exemptionData) {
    try {
      const { transactionId, exemptionType, reason, approverName } = exemptionData;

      if (!transactionId || !exemptionType) {
        throw new Error('Transaction ID and Exemption Type are required');
      }

      const validExemptions = [
        'Government',
        'Educational',
        'Charitable',
        'Religious',
        'Medical',
        'Export',
        'SEZ',
        'Other',
      ];
      if (!validExemptions.includes(exemptionType)) {
        throw new Error(`Invalid exemption type. Valid types: ${validExemptions.join(', ')}`);
      }

      if (!approverName) {
        throw new Error('Approver name is required');
      }

      // In real implementation, save to database
      const exemption = {
        transactionId,
        exemptionType,
        reason,
        approverName,
        approvedDate: new Date(),
        status: 'Approved',
        expiryDate: new Date(new Date().getFullYear() + 1, 0, 0), // 1 year validity
      };

      logger.info('Exemption applied successfully', {
        transactionId,
        exemptionType,
        approvedBy: approverName,
      });

      return exemption;
    } catch (error) {
      logger.error('Error applying exemption', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get exemptions for entity
   * @param {string} entityId - Entity ID
   * @param {string} country - Country code
   * @returns {Promise<Array>} - Active exemptions
   */
  static async getExemptionsForEntity(entityId, country) {
    try {
      if (!entityId || !country) {
        throw new Error('Entity ID and Country are required');
      }

      // In real implementation, query database
      const exemptions = [
        {
          exemptionType: 'Government',
          reason: 'Government department',
          expiryDate: new Date(new Date().getFullYear() + 1, 0, 0),
          status: 'Active',
        },
      ];

      logger.info('Exemptions retrieved for entity', {
        entityId,
        country,
        count: exemptions.length,
      });

      return exemptions;
    } catch (error) {
      logger.error('Error retrieving exemptions', { error: error.message, entityId, country });
      const err = new Error(error.message);
      err.status = 404;
      throw err;
    }
  }

  /**
   * Calculate total deductions and exemptions
   * @param {Object} calculationData - { grossAmount, applicableDeductions, applicableExemptions }
   * @returns {Promise<Object>} - Net amount after deductions
   */
  static async calculateNetAmount(calculationData) {
    try {
      const { grossAmount, applicableDeductions, applicableExemptions } = calculationData;

      if (!grossAmount) {
        throw new Error('Gross amount is required');
      }

      if (grossAmount < 0) {
        throw new Error('Gross amount cannot be negative');
      }

      let totalDeductions = 0;
      let deductionDetails = [];

      // Apply deductions
      if (Array.isArray(applicableDeductions)) {
        for (const deduction of applicableDeductions) {
          const amount = (grossAmount * deduction.rate) / 100;
          totalDeductions += amount;
          deductionDetails.push({
            name: deduction.name,
            rate: deduction.rate,
            amount: parseFloat(amount.toFixed(2)),
          });
        }
      }

      // Check exemptions (0% tax if exempted)
      let exempted = false;
      let exemptionReason = null;
      if (Array.isArray(applicableExemptions) && applicableExemptions.length > 0) {
        exempted = true;
        exemptionReason = applicableExemptions[0].reason;
        totalDeductions = grossAmount; // 100% exemption
      }

      const result = {
        grossAmount,
        totalDeductions: parseFloat(totalDeductions.toFixed(2)),
        netAmount: parseFloat((grossAmount - totalDeductions).toFixed(2)),
        exempted,
        exemptionReason,
        deductions: deductionDetails,
      };

      logger.info('Net amount calculated with deductions', {
        grossAmount,
        totalDeductions: result.totalDeductions,
        netAmount: result.netAmount,
      });

      return result;
    } catch (error) {
      logger.error('Error calculating net amount', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Validate deduction policy data
   * @param {Object} policyData - Policy data to validate
   * @returns {Object} - Validation result
   */
  static validateDeductionPolicyData(policyData) {
    const errors = [];

    if (!policyData.code) {
      errors.push('Deduction policy code is required');
    }
    if (!policyData.name) {
      errors.push('Deduction policy name is required');
    }
    if (!policyData.deductionType) {
      errors.push('Deduction type is required');
    }
    if (policyData.amount !== undefined && policyData.amount < 0) {
      errors.push('Deduction amount cannot be negative');
    }
    if (policyData.amount > 100) {
      errors.push('Deduction amount (as percentage) cannot exceed 100%');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default DeductionService;
