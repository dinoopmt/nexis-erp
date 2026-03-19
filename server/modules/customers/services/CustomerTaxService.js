/**
 * Customer Tax Service
 * Manages country-specific tax configurations for customers
 */

import Customer from '../../../Models/Customer.js';
import TaxMaster from '../../../Models/TaxMaster.js';
import logger from '../../../config/logger.js';

class CustomerTaxService {
  /**
   * Validate tax type
   */
  validateTaxType(taxType) {
    const validTypes = ['Registered', 'Unregistered', 'Non-resident', 'SEZ', 'Government Entity', 'Other'];
    return validTypes.includes(taxType);
  }

  /**
   * Get customer tax configuration
   */
  async getCustomerTaxConfig(customerId) {
    try {
      if (!customerId) {
        const error = new Error('Customer ID is required');
        error.status = 400;
        throw error;
      }

      const customer = await Customer.findOne({ _id: customerId, isDeleted: false })
        .populate('taxGroupId', 'name taxPercentage country');

      if (!customer) {
        const error = new Error('Customer not found');
        error.status = 404;
        throw error;
      }

      return {
        _id: customer._id,
        customerCode: customer.customerCode,
        name: customer.name,
        country: customer.country,
        taxType: customer.taxType,
        gstNumber: customer.gstNumber,
        taxGroup: customer.taxGroupId,
      };
    } catch (error) {
      logger.error('Error getting customer tax config', { customerId, error });
      throw error;
    }
  }

  /**
   * Update customer tax type
   */
  async updateCustomerTaxType(customerId, taxType) {
    try {
      if (!customerId) {
        const error = new Error('Customer ID is required');
        error.status = 400;
        throw error;
      }

      if (!taxType || !this.validateTaxType(taxType)) {
        const error = new Error('Invalid tax type. Must be one of: Registered, Unregistered, Non-resident, SEZ, Government Entity, Other');
        error.status = 400;
        throw error;
      }

      const customer = await Customer.findOne({ _id: customerId, isDeleted: false });

      if (!customer) {
        const error = new Error('Customer not found');
        error.status = 404;
        throw error;
      }

      // Can only set tax type for India customers
      if (customer.country !== 'India') {
        const error = new Error('Tax type is only applicable for India');
        error.status = 400;
        throw error;
      }

      customer.taxType = taxType;
      customer.updatedAt = new Date();

      await customer.save();

      logger.info('Customer tax type updated', { customerId, taxType });

      return customer;
    } catch (error) {
      logger.error('Error updating customer tax type', { customerId, error });
      throw error;
    }
  }

  /**
   * Update customer GST number
   */
  async updateCustomerGSTNumber(customerId, gstNumber) {
    try {
      if (!customerId) {
        const error = new Error('Customer ID is required');
        error.status = 400;
        throw error;
      }

      if (!gstNumber || !gstNumber.trim()) {
        const error = new Error('GST number is required');
        error.status = 400;
        throw error;
      }

      const customer = await Customer.findOne({ _id: customerId, isDeleted: false });

      if (!customer) {
        const error = new Error('Customer not found');
        error.status = 404;
        throw error;
      }

      // GST is only for India
      if (customer.country !== 'India') {
        const error = new Error('GST number is only applicable for India');
        error.status = 400;
        throw error;
      }

      // Validate GST format (15 characters, alphanumeric)
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(gstNumber.toUpperCase())) {
        logger.warn('GST format may be incorrect', { gstNumber });
        // Allow but warn - some legacy GSTs might not match exactly
      }

      // Check for uniqueness
      const existing = await Customer.findOne({
        gstNumber: gstNumber.toUpperCase(),
        _id: { $ne: customerId },
        isDeleted: false,
        country: 'India',
      });

      if (existing) {
        const error = new Error('GST number already exists for another customer');
        error.status = 409;
        throw error;
      }

      customer.gstNumber = gstNumber.toUpperCase();
      customer.updatedAt = new Date();

      await customer.save();

      logger.info('Customer GST number updated', { customerId, gstNumber });

      return customer;
    } catch (error) {
      logger.error('Error updating customer GST number', { customerId, error });
      throw error;
    }
  }

  /**
   * Assign tax group to customer
   */
  async assignTaxGroup(customerId, taxGroupId) {
    try {
      if (!customerId) {
        const error = new Error('Customer ID is required');
        error.status = 400;
        throw error;
      }

      if (!taxGroupId) {
        const error = new Error('Tax group ID is required');
        error.status = 400;
        throw error;
      }

      const customer = await Customer.findOne({ _id: customerId, isDeleted: false });

      if (!customer) {
        const error = new Error('Customer not found');
        error.status = 404;
        throw error;
      }

      const taxGroup = await TaxMaster.findOne({ _id: taxGroupId, isDeleted: false });

      if (!taxGroup) {
        const error = new Error('Tax group not found');
        error.status = 404;
        throw error;
      }

      // Verify tax group is for customer's country
      if (taxGroup.country !== customer.country) {
        const error = new Error(`Tax group is not applicable for ${customer.country}`);
        error.status = 400;
        throw error;
      }

      customer.taxGroupId = taxGroupId;
      customer.updatedAt = new Date();

      await customer.save();

      logger.info('Tax group assigned to customer', {
        customerId,
        taxGroupId,
        taxGroupName: taxGroup.name,
      });

      return customer;
    } catch (error) {
      logger.error('Error assigning tax group', { customerId, error });
      throw error;
    }
  }

  /**
   * Remove tax group from customer
   */
  async removeTaxGroup(customerId) {
    try {
      if (!customerId) {
        const error = new Error('Customer ID is required');
        error.status = 400;
        throw error;
      }

      const customer = await Customer.findOne({ _id: customerId, isDeleted: false });

      if (!customer) {
        const error = new Error('Customer not found');
        error.status = 404;
        throw error;
      }

      customer.taxGroupId = null;
      customer.updatedAt = new Date();

      await customer.save();

      logger.info('Tax group removed from customer', { customerId });

      return customer;
    } catch (error) {
      logger.error('Error removing tax group', { customerId, error });
      throw error;
    }
  }

  /**
   * Get customers by tax type
   */
  async getCustomersByTaxType(taxType, country = 'India') {
    try {
      if (!this.validateTaxType(taxType)) {
        const error = new Error('Invalid tax type');
        error.status = 400;
        throw error;
      }

      const customers = await Customer.find({
        taxType,
        country,
        isDeleted: false,
      })
        .populate('taxGroupId', 'name taxPercentage')
        .sort({ name: 1 });

      return customers;
    } catch (error) {
      logger.error('Error getting customers by tax type', { taxType, country, error });
      throw error;
    }
  }

  /**
   * Get customers with registered GST
   */
  async getRegisteredGSTCustomers(country = 'India') {
    try {
      const customers = await Customer.find({
        country,
        gstNumber: { $exists: true, $ne: '' },
        taxType: 'Registered',
        isDeleted: false,
      })
        .select('_id customerCode name gstNumber taxType')
        .sort({ name: 1 });

      return customers;
    } catch (error) {
      logger.error('Error getting registered GST customers', { country, error });
      throw error;
    }
  }

  /**
   * Get customers without GST (unregistered)
   */
  async getUnregisteredCustomers(country = 'India') {
    try {
      const customers = await Customer.find({
        country,
        $or: [
          { gstNumber: { $exists: false } },
          { gstNumber: '' },
          { taxType: 'Unregistered' },
        ],
        isDeleted: false,
      })
        .select('_id customerCode name country taxType')
        .sort({ name: 1 });

      return customers;
    } catch (error) {
      logger.error('Error getting unregistered customers', { country, error });
      throw error;
    }
  }

  /**
   * Get tax configuration by country
   */
  async getTaxConfigByCountry(country) {
    try {
      if (!['UAE', 'Oman', 'India'].includes(country)) {
        const error = new Error('Country must be one of: UAE, Oman, India');
        error.status = 400;
        throw error;
      }

      const stats = await Customer.aggregate([
        { $match: { country, isDeleted: false } },
        {
          $group: {
            _id: '$taxType',
            count: { $sum: 1 },
            avgCreditLimit: { $avg: '$creditLimit' },
          },
        },
        { $sort: { count: -1 } },
      ]);

      const withGST = await Customer.countDocuments({
        country,
        gstNumber: { $exists: true, $ne: '' },
        isDeleted: false,
      });

      const total = await Customer.countDocuments({
        country,
        isDeleted: false,
      });

      return {
        country,
        totalCustomers: total,
        customersWithGST: withGST,
        customersWithoutGST: total - withGST,
        byTaxType: stats,
      };
    } catch (error) {
      logger.error('Error getting tax config by country', { country, error });
      throw error;
    }
  }

  /**
   * Validate GST eligibility for transaction
   */
  async validateGSTEligibility(customerId) {
    try {
      if (!customerId) {
        const error = new Error('Customer ID is required');
        error.status = 400;
        throw error;
      }

      const customer = await Customer.findOne({ _id: customerId, isDeleted: false });

      if (!customer) {
        const error = new Error('Customer not found');
        error.status = 404;
        throw error;
      }

      if (customer.country !== 'India') {
        return {
          eligible: false,
          reason: 'Customer is not in India',
          country: customer.country,
        };
      }

      if (customer.taxType === 'Unregistered' || !customer.gstNumber) {
        return {
          eligible: false,
          reason: 'Customer is not registered for GST',
          taxType: customer.taxType,
        };
      }

      return {
        eligible: true,
        reason: 'Customer is eligible for GST',
        gstNumber: customer.gstNumber,
        taxType: customer.taxType,
      };
    } catch (error) {
      logger.error('Error validating GST eligibility', { customerId, error });
      throw error;
    }
  }

  /**
   * Get tax summary report
   */
  async getTaxSummaryReport() {
    try {
      const report = {
        byCountry: {},
        totalCustomers: 0,
      };

      const countries = ['UAE', 'Oman', 'India'];

      for (const country of countries) {
        const config = await this.getTaxConfigByCountry(country);
        report.byCountry[country] = config;
        report.totalCustomers += config.totalCustomers;
      }

      return report;
    } catch (error) {
      logger.error('Error getting tax summary report', { error });
      throw error;
    }
  }
}

export default new CustomerTaxService();
