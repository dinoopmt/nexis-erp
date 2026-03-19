import logger from '../../../config/logger.js';
import { AppError } from '../../../config/errorHandler.js';

/**
 * TaxComplianceService
 * Manages tax compliance, validations, and compliance reporting
 * Tracks tax filings, deadlines, and compliance status
 */
class TaxComplianceService {
  /**
   * Create tax compliance record
   * @param {Object} complianceData - { entityId, complianceType, country, dueDate, filingDeadline }
   * @returns {Promise<Object>} - Created compliance record
   */
  static async createComplianceRecord(complianceData) {
    try {
      const { entityId, complianceType, country, dueDate, filingDeadline } = complianceData;

      if (!entityId || !complianceType || !country) {
        throw new Error('Entity ID, Compliance Type, and Country are required');
      }

      const validTypes = ['GST_Return', 'GST_Refund', 'TDS_Filing', 'Annual_Return', 'VAT_Return', 'Audit'];
      if (!validTypes.includes(complianceType)) {
        throw new Error(`Invalid compliance type. Valid types: ${validTypes.join(', ')}`);
      }

      // In real implementation, save to database
      const record = {
        entityId,
        complianceType,
        country,
        dueDate: dueDate || new Date(),
        filingDeadline: filingDeadline || new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000),
        status: 'Pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      logger.info('Compliance record created successfully', {
        entityId,
        complianceType,
        country,
        dueDate,
      });

      return record;
    } catch (error) {
      logger.error('Error creating compliance record', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get compliance calendar for entity
   * @param {string} entityId - Entity ID
   * @param {string} country - Country code
   * @param {Object} filters - { year, month }
   * @returns {Promise<Array>} - Compliance calendar
   */
  static async getComplianceCalendar(entityId, country, filters = {}) {
    try {
      const { year = new Date().getFullYear(), month } = filters;

      if (!entityId || !country) {
        throw new Error('Entity ID and Country are required');
      }

      // India GST compliance calendar
      let calendar = [];

      if (country === 'India') {
        // Monthly GSTR-1 filing
        calendar.push({
          month: 'Every Month',
          compliances: [
            {
              type: 'GSTR-1_Filing',
              dueDate: '11th of next month',
              description: 'Sales report filing',
            },
            {
              type: 'GSTR-3B_Filing',
              dueDate: '20th of next month',
              description: 'Monthly summary and ITC',
            },
          ],
        });

        // Quarterly return
        calendar.push({
          month: 'Quarterly',
          compliances: [
            {
              type: 'GSTR-2A_Analysis',
              dueDate: '15th of next month',
              description: 'Purchase report review',
            },
          ],
        });

        // Annual compliance
        calendar.push({
          month: 'Annual',
          compliances: [
            {
              type: 'GSTR-9_Annual_Return',
              dueDate: '31st December',
              description: 'Annual return filing',
            },
            {
              type: 'GSTR-9C_Audit',
              dueDate: '31st January',
              description: 'Audit report if required',
            },
          ],
        });
      }

      logger.info('Compliance calendar retrieved', { entityId, country, count: calendar.length });

      return calendar;
    } catch (error) {
      logger.error('Error retrieving compliance calendar', {
        error: error.message,
        entityId,
        country,
      });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Validate transaction for tax compliance
   * @param {Object} transactionData - { transactionType, amount, country, vendorType, documentType }
   * @returns {Promise<Object>} - Compliance validation result
   */
  static async validateTransactionCompliance(transactionData) {
    try {
      const { transactionType, amount, country, vendorType, documentType } = transactionData;

      if (!transactionType || !amount || !country) {
        throw new Error('Transaction Type, Amount, and Country are required');
      }

      const validations = [];
      let compliant = true;
      const warnings = [];

      // GST compliance checks for India
      if (country === 'India') {
        // Check vendor registration
        if (transactionType === 'Purchase' && vendorType === 'Unregistered' && amount > 5000) {
          validations.push({
            check: 'Large unregistered vendor payment',
            status: 'Warning',
            message: 'Consider requesting GST registration for large purchases',
          });
          warnings.push('Large unregistered vendor payment detected');
        }

        // Check invoice requirements
        if ((!documentType || documentType === 'None') && transactionType === 'Purchase') {
          validations.push({
            check: 'Missing invoice',
            status: 'Error',
            message: 'Invoice document required for GST compliance',
          });
          compliant = false;
        }

        // Check export documentation
        if (transactionType === 'Sale' && amount > 100000) {
          validations.push({
            check: 'High value transaction',
            status: 'Info',
            message: 'Ensure proper documentation for high value sales',
          });
        }
      }

      const result = {
        transactionType,
        country,
        compliant,
        validations,
        warnings,
        complianceScore: compliant ? 100 : 60,
      };

      logger.info('Transaction compliance validated', {
        transactionType,
        country,
        compliant,
      });

      return result;
    } catch (error) {
      logger.error('Error validating transaction compliance', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Generate tax compliance report
   * @param {Object} reportData - { entityId, country, fromDate, toDate }
   * @returns {Promise<Object>} - Compliance report
   */
  static async generateComplianceReport(reportData) {
    try {
      const { entityId, country, fromDate, toDate } = reportData;

      if (!entityId || !country) {
        throw new Error('Entity ID and Country are required');
      }

      // In real implementation, aggregate from database
      const report = {
        entityId,
        country,
        period: {
          fromDate: fromDate || new Date(new Date().getFullYear(), 0, 1),
          toDate: toDate || new Date(),
        },
        complianceStatus: {
          totalFilings: 12,
          completedFilings: 11,
          pendingFilings: 1,
          overdueFilings: 0,
          completionRate: 91.67,
        },
        filingStatus: [
          {
            type: 'GSTR-1_Sales',
            status: 'Completed',
            dueDate: '2024-01-11',
            filedDate: '2024-01-10',
            daysAhead: 1,
          },
          {
            type: 'GSTR-3B_Summary',
            status: 'Completed',
            dueDate: '2024-01-20',
            filedDate: '2024-01-19',
            daysAhead: 1,
          },
          {
            type: 'GSTR-2A_Purchases',
            status: 'Pending',
            dueDate: '2024-01-15',
            filedDate: null,
            daysOverdue: 0,
          },
        ],
        issues: [],
        recommendations: [
          'File pending GSTR-2A return',
          'Reconcile HSN-wise turnover',
          'Maintain invoice trail for audit',
        ],
        overallScore: 85,
      };

      logger.info('Compliance report generated', {
        entityId,
        country,
        completionRate: report.complianceStatus.completionRate,
      });

      return report;
    } catch (error) {
      logger.error('Error generating compliance report', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Check filing deadline status
   * @param {string} entityId - Entity ID
   * @param {string} filingType - Filing type
   * @returns {Promise<Object>} - Deadline status
   */
  static async checkFilingDeadline(entityId, filingType) {
    try {
      if (!entityId || !filingType) {
        throw new Error('Entity ID and Filing Type are required');
      }

      const now = new Date();
      const dueDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 11); // 11th of next month

      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      let status = 'On Track';
      if (daysUntilDue < 0) {
        status = 'Overdue';
      } else if (daysUntilDue <= 3) {
        status = 'Due Soon';
      } else if (daysUntilDue <= 7) {
        status = 'Upcoming';
      }

      const result = {
        entityId,
        filingType,
        dueDate,
        status,
        daysUntilDue,
        urgency: status === 'Overdue' ? 'Critical' : status === 'Due Soon' ? 'High' : 'Normal',
      };

      logger.info('Filing deadline status checked', {
        entityId,
        filingType,
        status,
        daysUntilDue,
      });

      return result;
    } catch (error) {
      logger.error('Error checking filing deadline', { error: error.message, entityId, filingType });
      const err = new Error(error.message);
      err.status = 404;
      throw err;
    }
  }

  /**
   * Record tax payment
   * @param {Object} paymentData - { entityId, paymentType, amount, paymentDate, referenceNumber }
   * @returns {Promise<Object>} - Recorded payment
   */
  static async recordTaxPayment(paymentData) {
    try {
      const { entityId, paymentType, amount, paymentDate, referenceNumber } = paymentData;

      if (!entityId || !paymentType || !amount) {
        throw new Error('Entity ID, Payment Type, and Amount are required');
      }

      if (amount <= 0) {
        throw new Error('Payment amount must be greater than 0');
      }

      const validPaymentTypes = ['GST_Liability', 'TDS', 'Advance_Tax', 'Interest', 'Penalty'];
      if (!validPaymentTypes.includes(paymentType)) {
        throw new Error(`Invalid payment type. Valid types: ${validPaymentTypes.join(', ')}`);
      }

      // In real implementation, save to database
      const payment = {
        entityId,
        paymentType,
        amount,
        paymentDate: paymentDate || new Date(),
        referenceNumber,
        status: 'Recorded',
        recordedAt: new Date(),
      };

      logger.info('Tax payment recorded successfully', {
        entityId,
        paymentType,
        amount,
        referenceNumber,
      });

      return payment;
    } catch (error) {
      logger.error('Error recording tax payment', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get tax payment history
   * @param {string} entityId - Entity ID
   * @param {Object} filters - { fromDate, toDate, paymentType }
   * @returns {Promise<Array>} - Payment history
   */
  static async getTaxPaymentHistory(entityId, filters = {}) {
    try {
      const { fromDate, toDate, paymentType } = filters;

      if (!entityId) {
        throw new Error('Entity ID is required');
      }

      // In real implementation, query database
      const payments = [
        {
          paymentType: 'GST_Liability',
          amount: 50000,
          paymentDate: '2024-01-15',
          referenceNumber: 'GSTPAY001',
          status: 'Recorded',
        },
        {
          paymentType: 'TDS',
          amount: 5000,
          paymentDate: '2024-01-20',
          referenceNumber: 'TDSPAY001',
          status: 'Recorded',
        },
      ];

      logger.info('Tax payment history retrieved', {
        entityId,
        count: payments.length,
      });

      return payments;
    } catch (error) {
      logger.error('Error retrieving tax payment history', { error: error.message, entityId });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Calculate penalties and interest
   * @param {Object} penaltyData - { taxAmount, daysOverdue, penaltyType }
   * @returns {Promise<Object>} - Penalty and interest calculation
   */
  static async calculatePenaltiesAndInterest(penaltyData) {
    try {
      const { taxAmount, daysOverdue, penaltyType } = penaltyData;

      if (!taxAmount || daysOverdue === undefined) {
        throw new Error('Tax Amount and Days Overdue are required');
      }

      if (taxAmount < 0 || daysOverdue < 0) {
        throw new Error('Tax amount and days overdue cannot be negative');
      }

      // India GST penalty rules
      let penalty = 0;
      let interest = 0;

      if (daysOverdue > 0) {
        // Interest: 18% per annum
        const interestRate = 18 / 365;
        interest = (taxAmount * interestRate * daysOverdue) / 100;

        // Penalty varies by type
        if (penaltyType === 'Late_Filing') {
          penalty = 100; // Flat penalty
        } else if (penaltyType === 'Non_Payment') {
          penalty = Math.min(taxAmount * 0.25, 10000); // 25% or max 10000
        } else if (penaltyType === 'Fraud') {
          penalty = Math.min(taxAmount * 1, 100000); // 100% or max 100000
        }
      }

      const result = {
        taxAmount,
        daysOverdue,
        interestAmount: parseFloat(interest.toFixed(2)),
        penaltyAmount: parseFloat(penalty.toFixed(2)),
        totalLiability: parseFloat((taxAmount + interest + penalty).toFixed(2)),
        breakdown: {
          original: taxAmount,
          interest: parseFloat(interest.toFixed(2)),
          penalty: parseFloat(penalty.toFixed(2)),
        },
      };

      logger.info('Penalties and interest calculated', {
        taxAmount,
        daysOverdue,
        totalLiability: result.totalLiability,
      });

      return result;
    } catch (error) {
      logger.error('Error calculating penalties', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }
}

export default TaxComplianceService;
