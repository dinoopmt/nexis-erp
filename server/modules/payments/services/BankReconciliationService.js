import logger from '../../../config/logger.js';
import { AppError } from '../../../config/errorHandler.js';

/**
 * BankReconciliationService
 * Manages bank statement reconciliation with GL entries
 * Handles matching, variance analysis, and discrepancy resolution
 */
class BankReconciliationService {
  /**
   * Upload bank statement
   * @param {Object} statementData - { bankAccountId, statementDate, transactions, openingBalance, closingBalance, currency }
   * @returns {Promise<Object>} - Uploaded statement record
   */
  static async uploadBankStatement(statementData) {
    try {
      const { bankAccountId, statementDate, transactions, openingBalance, closingBalance, currency } = statementData;

      if (!bankAccountId || !statementDate || !transactions || transactions.length === 0) {
        throw new Error('Bank Account ID, Statement Date, and Transactions are required');
      }

      const statement = {
        statementId: `STMT_${new Date().getTime()}`,
        bankAccountId,
        statementDate,
        openingBalance,
        closingBalance,
        currency: currency || 'USD',
        transactionCount: transactions.length,
        transactions,
        uploadedAt: new Date(),
        reconciliationStatus: 'Pending',
        matched: 0,
        unmatched: transactions.length,
      };

      logger.info('Bank statement uploaded', {
        statementId: statement.statementId,
        bankAccountId,
        transactionCount: transactions.length,
      });

      return statement;
    } catch (error) {
      logger.error('Error uploading bank statement', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Match bank transactions with GL entries
   * @param {string} statementId - Statement ID
   * @param {Array} matches - Array of { bankTxnId, glEntryId, amount }
   * @returns {Promise<Object>} - Matching result
   */
  static async matchBankTransactions(statementId, matches) {
    try {
      if (!statementId || !matches || matches.length === 0) {
        throw new Error('Statement ID and matches are required');
      }

      // In real implementation, validate matches in database
      const result = {
        statementId,
        matchingId: `MATCH_${new Date().getTime()}`,
        totalMatches: matches.length,
        matchedAmount: matches.reduce((sum, m) => sum + m.amount, 0),
        matches,
        matchedAt: new Date(),
        matchingStatus: 'Matched',
        unmatchedCount: 0,
      };

      logger.info('Bank transactions matched', {
        statementId,
        totalMatches: matches.length,
        matchedAmount: result.matchedAmount,
      });

      return result;
    } catch (error) {
      logger.error('Error matching bank transactions', { error: error.message, statementId });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get reconciliation differences
   * @param {string} statementId - Statement ID
   * @returns {Promise<Object>} - Discrepancies and variances
   */
  static async getReconciliationDifferences(statementId) {
    try {
      if (!statementId) {
        throw new Error('Statement ID is required');
      }

      // In real implementation, fetch from database
      const differences = {
        statementId,
        totalDifferences: 3,
        totalDifferenceAmount: 5000,
        differences: [
          {
            diffId: 'DIFF_001',
            type: 'BankOnly',
            description: 'Interest credited by bank',
            amount: 1500,
            bankDate: new Date(),
            glDate: null,
            status: 'Pending',
          },
          {
            diffId: 'DIFF_002',
            type: 'GLOnly',
            description: 'Check not yet cleared',
            amount: 2500,
            bankDate: null,
            glDate: new Date(),
            status: 'Outstanding',
          },
          {
            diffId: 'DIFF_003',
            type: 'AmountMismatch',
            description: 'Amount mismatch - Bank 5K, GL 4.5K',
            amount: 500,
            bankAmount: 5000,
            glAmount: 4500,
            status: 'Variance',
          },
        ],
        analysis: {
          outstandingChecks: 2500,
          depositInTransit: 0,
          bankCharges: 0,
          errors: 500,
        },
      };

      logger.info('Reconciliation differences retrieved', {
        statementId,
        totalDifferences: differences.totalDifferences,
      });

      return differences;
    } catch (error) {
      logger.error('Error retrieving reconciliation differences', {
        error: error.message,
        statementId,
      });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Reconcile statement
   * @param {string} statementId - Statement ID
   * @param {Object} reconcData - { adjustments, notes, approvedBy }
   * @returns {Promise<Object>} - Reconciliation result
   */
  static async reconcileStatement(statementId, reconcData) {
    try {
      if (!statementId) {
        throw new Error('Statement ID is required');
      }

      const { adjustments, notes, approvedBy } = reconcData;

      // In real implementation, apply adjustments and reconcile
      const reconciliation = {
        reconciliationId: `RECON_${new Date().getTime()}`,
        statementId,
        status: 'Reconciled',
        reconciliationDate: new Date(),
        adjustmentsApplied: adjustments ? adjustments.length : 0,
        adjustments,
        glAdjustmentsJournal: { journalId: 'JE_ADJ', status: 'Posted' },
        notes,
        approvedBy,
        variance: 0,
      };

      logger.info('Statement reconciled', {
        reconciliationId: reconciliation.reconciliationId,
        statementId,
        adjustmentsCount: reconciliation.adjustmentsApplied,
      });

      return reconciliation;
    } catch (error) {
      logger.error('Error reconciling statement', { error: error.message, statementId });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get unreconciled transactions
   * @param {string} bankAccountId - Bank account ID
   * @param {Object} filters - { limit, daysOpen, minAmount }
   * @returns {Promise<Array>} - Unreconciled transactions
   */
  static async getUnreconciledTransactions(bankAccountId, filters = {}) {
    try {
      const { limit = 50, daysOpen, minAmount } = filters;

      if (!bankAccountId) {
        throw new Error('Bank Account ID is required');
      }

      // In real implementation, query from database
      const unreconciled = [
        {
          txnId: 'TXN_001',
          date: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
          description: 'Check #1234',
          amount: 2500,
          type: 'Check',
          daysOpen: 30,
          status: 'Outstanding',
        },
        {
          txnId: 'TXN_002',
          date: new Date(new Date().getTime() - 5 * 24 * 60 * 60 * 1000),
          description: 'Wire transfer',
          amount: 5000,
          type: 'Transfer',
          daysOpen: 5,
          status: 'InTransit',
        },
      ];

      logger.info('Unreconciled transactions retrieved', {
        bankAccountId,
        totalTransactions: unreconciled.length,
      });

      return unreconciled.slice(0, limit);
    } catch (error) {
      logger.error('Error retrieving unreconciled transactions', {
        error: error.message,
        bankAccountId,
      });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get reconciliation history
   * @param {string} bankAccountId - Bank account ID
   * @param {Object} filters - { limit, fromDate, toDate }
   * @returns {Promise<Array>} - Reconciliation history
   */
  static async getReconciliationHistory(bankAccountId, filters = {}) {
    try {
      const { limit = 50, fromDate, toDate } = filters;

      if (!bankAccountId) {
        throw new Error('Bank Account ID is required');
      }

      // In real implementation, query from database
      const history = [
        {
          reconciliationId: 'RECON_001',
          statementDate: new Date(),
          reconciledDate: new Date(),
          reconciledBy: 'USER_001',
          openingBalance: 100000,
          closingBalance: 150000,
          totalTransactions: 25,
          variance: 0,
          status: 'Completed',
        },
        {
          reconciliationId: 'RECON_002',
          statementDate: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
          reconciledDate: new Date(new Date().getTime() - 28 * 24 * 60 * 60 * 1000),
          reconciledBy: 'USER_002',
          openingBalance: 50000,
          closingBalance: 100000,
          totalTransactions: 30,
          variance: 0,
          status: 'Completed',
        },
      ];

      logger.info('Reconciliation history retrieved', {
        bankAccountId,
        totalReconciliations: history.length,
      });

      return history.slice(0, limit);
    } catch (error) {
      logger.error('Error retrieving reconciliation history', {
        error: error.message,
        bankAccountId,
      });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Generate reconciliation report
   * @param {string} bankAccountId - Bank account ID
   * @param {Object} filters - { fromDate, toDate, includeDetails }
   * @returns {Promise<Object>} - Reconciliation report
   */
  static async generateReconciliationReport(bankAccountId, filters = {}) {
    try {
      const { fromDate, toDate, includeDetails = false } = filters;

      if (!bankAccountId) {
        throw new Error('Bank Account ID is required');
      }

      // In real implementation, generate report from data
      const report = {
        reportId: `RECONRPT_${new Date().getTime()}`,
        bankAccountId,
        period: { fromDate, toDate },
        summary: {
          totalStatements: 12,
          totalTransactions: 450,
          totalAmount: 5250000,
          reconciliationRate: 98.5,
          averageVariance: 500,
          maxVariance: 2500,
        },
        monthlyBreakdown: [
          { month: 'January', transactions: 38, amount: 450000, variance: 0 },
          { month: 'February', transactions: 35, amount: 420000, variance: 500 },
          { month: 'March', transactions: 42, amount: 480000, variance: 0 },
        ],
        pendingReconciliations: 1,
        completedReconciliations: 11,
        averageTimeToReconcile: 2.3,
        generatedAt: new Date(),
      };

      logger.info('Reconciliation report generated', {
        reportId: report.reportId,
        bankAccountId,
        reconciliationRate: report.summary.reconciliationRate,
      });

      return report;
    } catch (error) {
      logger.error('Error generating reconciliation report', {
        error: error.message,
        bankAccountId,
      });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }
}

export default BankReconciliationService;
