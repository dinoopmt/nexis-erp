/**
 * Customer Credit Service
 * Manages customer credit limits, outstanding amounts, and credit analysis
 */

import Customer from '../../../Models/Customer.js';
import logger from '../../../config/logger.js';

class CustomerCreditService {
  /**
   * Get customer credit profile
   */
  async getCustomerCreditProfile(customerId) {
    try {
      if (!customerId) {
        const error = new Error('Customer ID is required');
        error.status = 400;
        throw error;
      }

      const customer = await Customer.findOne({ _id: customerId, isDeleted: false })
        .populate('taxGroupId', 'name taxPercentage')
        .populate('ledgerAccountId', 'accountName accountCode');

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
        paymentType: customer.paymentType,
        paymentTerms: customer.paymentTerms,
        creditLimit: customer.creditLimit,
        taxType: customer.taxType,
        status: customer.status,
      };
    } catch (error) {
      logger.error('Error getting customer credit profile', { customerId, error });
      throw error;
    }
  }

  /**
   * Update customer credit limit
   */
  async updateCreditLimit(customerId, newCreditLimit) {
    try {
      if (!customerId) {
        const error = new Error('Customer ID is required');
        error.status = 400;
        throw error;
      }

      if (newCreditLimit === undefined || newCreditLimit === null) {
        const error = new Error('Credit limit is required');
        error.status = 400;
        throw error;
      }

      if (newCreditLimit < 0) {
        const error = new Error('Credit limit cannot be negative');
        error.status = 400;
        throw error;
      }

      const customer = await Customer.findOne({ _id: customerId, isDeleted: false });

      if (!customer) {
        const error = new Error('Customer not found');
        error.status = 404;
        throw error;
      }

      const oldCreditLimit = customer.creditLimit;
      customer.creditLimit = newCreditLimit;
      customer.updatedAt = new Date();

      await customer.save();

      logger.info('Customer credit limit updated', {
        customerId,
        oldCreditLimit,
        newCreditLimit,
      });

      return {
        customerId,
        customerCode: customer.customerCode,
        name: customer.name,
        oldCreditLimit,
        newCreditLimit,
        updatedAt: customer.updatedAt,
      };
    } catch (error) {
      logger.error('Error updating credit limit', { customerId, error });
      throw error;
    }
  }

  /**
   * Get customers exceeding credit limit
   * Used to identify high-risk customers
   */
  async getCustomersExceedingCreditLimit() {
    try {
      // This would typically query sales invoices/outstanding AR
      // For now, return customers with low or zero credit limits
      const customers = await Customer.find({
        creditLimit: { $lte: 0 },
        status: 'Active',
        isDeleted: false,
      })
        .select('_id customerCode name creditLimit paymentTerms country')
        .sort({ name: 1 });

      return customers;
    } catch (error) {
      logger.error('Error getting customers exceeding credit limit', { error });
      throw error;
    }
  }

  /**
   * Get customers by credit limit range
   */
  async getCustomersByCreditLimitRange(minLimit, maxLimit) {
    try {
      if (minLimit === undefined || maxLimit === undefined) {
        const error = new Error('Min and max credit limits are required');
        error.status = 400;
        throw error;
      }

      if (minLimit < 0 || maxLimit < 0 || minLimit > maxLimit) {
        const error = new Error('Invalid credit limit range');
        error.status = 400;
        throw error;
      }

      const customers = await Customer.find({
        creditLimit: { $gte: minLimit, $lte: maxLimit },
        isDeleted: false,
      })
        .select('_id customerCode name creditLimit country status')
        .sort({ creditLimit: -1 });

      return customers;
    } catch (error) {
      logger.error('Error getting customers by credit limit range', { minLimit, maxLimit, error });
      throw error;
    }
  }

  /**
   * Calculate total credit available to customer
   */
  calculateAvailableCredit(customer, outstandingAmount) {
    try {
      const availableCredit = customer.creditLimit - outstandingAmount;
      return Math.max(0, availableCredit);
    } catch (error) {
      logger.error('Error calculating available credit', { error });
      throw error;
    }
  }

  /**
   * Check if customer can make purchase within credit limit
   */
  async canMakePurchase(customerId, purchaseAmount, currentOutstanding = 0) {
    try {
      if (!customerId) {
        const error = new Error('Customer ID is required');
        error.status = 400;
        throw error;
      }

      if (purchaseAmount === undefined || purchaseAmount < 0) {
        const error = new Error('Purchase amount must be a positive number');
        error.status = 400;
        throw error;
      }

      const customer = await Customer.findOne({ _id: customerId, isDeleted: false });

      if (!customer) {
        const error = new Error('Customer not found');
        error.status = 404;
        throw error;
      }

      if (customer.status !== 'Active') {
        return {
          allowed: false,
          reason: `Customer status is ${customer.status}`,
        };
      }

      if (customer.paymentType === 'Cash Sale') {
        return {
          allowed: true,
          reason: 'Cash sale - no credit check',
        };
      }

      const availableCredit = this.calculateAvailableCredit(customer, currentOutstanding);

      if (purchaseAmount > availableCredit) {
        return {
          allowed: false,
          reason: 'Purchase amount exceeds available credit',
          creditLimit: customer.creditLimit,
          currentOutstanding,
          availableCredit,
          requiredAmount: purchaseAmount,
        };
      }

      return {
        allowed: true,
        reason: 'Purchase allowed within credit limit',
        creditLimit: customer.creditLimit,
        currentOutstanding,
        availableCredit,
        remainingAfterPurchase: availableCredit - purchaseAmount,
      };
    } catch (error) {
      logger.error('Error checking purchase eligibility', { customerId, purchaseAmount, error });
      throw error;
    }
  }

  /**
   * Get customer credit analysis
   */
  async getCreditAnalysis(customers, outstandingAmounts = {}) {
    try {
      if (!Array.isArray(customers)) {
        const error = new Error('Customers array is required');
        error.status = 400;
        throw error;
      }

      const analysis = {
        totalCreditLimit: 0,
        totalOutstanding: 0,
        utilizationRate: 0,
        riskCustomers: [],
        healthyCustomers: [],
        overLimitCustomers: [],
      };

      customers.forEach(customer => {
        const outstanding = outstandingAmounts[customer._id?.toString()] || 0;
        const available = this.calculateAvailableCredit(customer, outstanding);
        const utilizationRate = customer.creditLimit > 0 ? (outstanding / customer.creditLimit) * 100 : 0;

        analysis.totalCreditLimit += customer.creditLimit;
        analysis.totalOutstanding += outstanding;

        const customerAnalysis = {
          _id: customer._id,
          customerCode: customer.customerCode,
          name: customer.name,
          creditLimit: customer.creditLimit,
          outstanding,
          available,
          utilizationRate: parseFloat(utilizationRate.toFixed(2)),
          status: customer.status,
        };

        if (utilizationRate >= 90) {
          analysis.riskCustomers.push(customerAnalysis);
        } else if (outstanding > customer.creditLimit) {
          analysis.overLimitCustomers.push(customerAnalysis);
        } else {
          analysis.healthyCustomers.push(customerAnalysis);
        }
      });

      analysis.utilizationRate = analysis.totalCreditLimit > 0
        ? parseFloat(((analysis.totalOutstanding / analysis.totalCreditLimit) * 100).toFixed(2))
        : 0;

      return analysis;
    } catch (error) {
      logger.error('Error getting credit analysis', { error });
      throw error;
    }
  }

  /**
   * Get credit utilization report
   */
  async getCreditUtilizationReport(outstandingData) {
    try {
      if (!Array.isArray(outstandingData)) {
        const error = new Error('Outstanding data array is required');
        error.status = 400;
        throw error;
      }

      const report = {
        byUtilization: {
          zeroToFifty: [],
          fiftyToSeventy: [],
          seventyToNinety: [],
          ninetyPlus: [],
        },
        summary: {
          totalCustomers: outstandingData.length,
          healthyCount: 0,
          cautionCount: 0,
          riskCount: 0,
        },
      };

      outstandingData.forEach(item => {
        const rate = item.creditLimit > 0 ? (item.outstanding / item.creditLimit) * 100 : 0;

        const customerData = {
          customerId: item.customerId,
          customerCode: item.customerCode,
          name: item.name,
          creditLimit: item.creditLimit,
          outstanding: item.outstanding,
          available: item.creditLimit - item.outstanding,
          utilizationRate: parseFloat(rate.toFixed(2)),
        };

        if (rate >= 0 && rate <= 50) {
          report.byUtilization.zeroToFifty.push(customerData);
          report.summary.healthyCount++;
        } else if (rate > 50 && rate <= 70) {
          report.byUtilization.fiftyToSeventy.push(customerData);
          report.summary.healthyCount++;
        } else if (rate > 70 && rate < 90) {
          report.byUtilization.seventyToNinety.push(customerData);
          report.summary.cautionCount++;
        } else if (rate >= 90) {
          report.byUtilization.ninetyPlus.push(customerData);
          report.summary.riskCount++;
        }
      });

      return report;
    } catch (error) {
      logger.error('Error getting credit utilization report', { error });
      throw error;
    }
  }

  /**
   * Get payment terms distribution
   */
  async getPaymentTermsDistribution() {
    try {
      const distribution = await Customer.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: '$paymentTerms',
            count: { $sum: 1 },
            avgCreditLimit: { $avg: '$creditLimit' },
          },
        },
        { $sort: { count: -1 } },
      ]);

      return distribution;
    } catch (error) {
      logger.error('Error getting payment terms distribution', { error });
      throw error;
    }
  }

  /**
   * Get customers on hold
   */
  async getCustomersOnHold() {
    try {
      const customers = await Customer.find({
        status: 'On Hold',
        isDeleted: false,
      })
        .select('_id customerCode name creditLimit paymentTerms country')
        .sort({ name: 1 });

      return customers;
    } catch (error) {
      logger.error('Error getting customers on hold', { error });
      throw error;
    }
  }

  /**
   * Get credit limit summary by country
   */
  async getCreditLimitSummaryByCountry() {
    try {
      const summary = await Customer.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: '$country',
            totalCreditLimit: { $sum: '$creditLimit' },
            averageCreditLimit: { $avg: '$creditLimit' },
            maxCreditLimit: { $max: '$creditLimit' },
            minCreditLimit: { $min: '$creditLimit' },
            customerCount: { $sum: 1 },
          },
        },
        { $sort: { totalCreditLimit: -1 } },
      ]);

      return summary;
    } catch (error) {
      logger.error('Error getting credit limit summary by country', { error });
      throw error;
    }
  }
}

export default new CustomerCreditService();
