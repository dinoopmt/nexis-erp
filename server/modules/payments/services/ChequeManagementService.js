import logger from '../../../config/logger.js';
import { AppError } from '../../../config/errorHandler.js';

/**
 * ChequeManagementService
 * Manages cheque issuance, clearing, and processing
 * Handles cheque status, bounces, and reconciliation
 */
class ChequeManagementService {
  /**
   * Issue cheque
   * @param {Object} chequeData - { bankAccountId, payeeName, amount, chequeDate, dueDate, description, issuedTo }
   * @returns {Promise<Object>} - Issued cheque record
   */
  static async issueCheque(chequeData) {
    try {
      const { bankAccountId, payeeName, amount, chequeDate, dueDate, description, issuedTo } = chequeData;

      if (!bankAccountId || !payeeName || !amount || !chequeDate) {
        throw new Error('Bank Account, Payee Name, Amount, and Cheque Date are required');
      }

      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Generate cheque number (in real implementation, from sequence)
      const chequeNumber = `CHQ_${Math.floor(Math.random() * 1000000)
        .toString()
        .padStart(6, '0')}`;

      const cheque = {
        chequeId: `CHEQUE_${new Date().getTime()}`,
        chequeNumber,
        bankAccountId,
        payeeName,
        amount,
        chequeDate,
        dueDate: dueDate || chequeDate,
        description,
        issuedTo,
        status: 'Issued',
        issuedDate: new Date(),
        clearedDate: null,
        bounceDate: null,
        bounceReason: null,
      };

      logger.info('Cheque issued', {
        chequeId: cheque.chequeId,
        chequeNumber,
        payeeName,
        amount,
        status: 'Issued',
      });

      return cheque;
    } catch (error) {
      logger.error('Error issuing cheque', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Record cheque clearing
   * @param {string} chequeId - Cheque ID
   * @param {Object} clearingData - { clearedDate, clearingAmount, bankRef, depositAccount }
   * @returns {Promise<Object>} - Cleared cheque
   */
  static async clearCheque(chequeId, clearingData) {
    try {
      if (!chequeId) {
        throw new Error('Cheque ID is required');
      }

      const { clearedDate, clearingAmount, bankRef, depositAccount } = clearingData;

      // In real implementation, update cheque in database
      const cleared = {
        chequeId,
        status: 'Cleared',
        clearedDate: clearedDate || new Date(),
        clearingAmount,
        bankReference: bankRef,
        depositAccount,
        glEntry: { journalId: 'JE_CHEQUE', status: 'Posted' },
      };

      logger.info('Cheque cleared', {
        chequeId,
        status: 'Cleared',
        clearingAmount,
        bankRef,
      });

      return cleared;
    } catch (error) {
      logger.error('Error clearing cheque', { error: error.message, chequeId });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Record cheque bounce
   * @param {string} chequeId - Cheque ID
   * @param {Object} bounceData - { bounceDate, bounceReason, bounceCharges, noticeDate }
   * @returns {Promise<Object>} - Bounced cheque record
   */
  static async recordChequeBounce(chequeId, bounceData) {
    try {
      if (!chequeId) {
        throw new Error('Cheque ID is required');
      }

      const { bounceDate, bounceReason, bounceCharges, noticeDate } = bounceData;

      const validReasons = [
        'InsufficientFunds',
        'ClosedAccount',
        'InvalidSignature',
        'AccountStopped',
        'SignatureMismatch',
        'DeferredCheque',
      ];
      if (bounceReason && !validReasons.includes(bounceReason)) {
        throw new Error(`Invalid bounce reason. Valid reasons: ${validReasons.join(', ')}`);
      }

      // In real implementation, update cheque and create reversal entries
      const bounce = {
        chequeId,
        bounceId: `BOUNCE_${new Date().getTime()}`,
        status: 'Bounced',
        bounceDate: bounceDate || new Date(),
        bounceReason,
        bounceCharges: bounceCharges || 0,
        noticeDate,
        glReversalEntry: { journalId: 'JE_BOUNCE', status: 'Posted' },
        bounceChargesEntry: bounceCharges
          ? { journalId: 'JE_CHARGES', status: 'Posted' }
          : null,
      };

      logger.warn('Cheque bounce recorded', {
        chequeId,
        bounceId: bounce.bounceId,
        bounceReason,
        bounceCharges,
      });

      return bounce;
    } catch (error) {
      logger.error('Error recording cheque bounce', { error: error.message, chequeId });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get cheque status
   * @param {string} chequeId - Cheque ID
   * @returns {Promise<Object>} - Cheque status and details
   */
  static async getChequeStatus(chequeId) {
    try {
      if (!chequeId) {
        throw new Error('Cheque ID is required');
      }

      // In real implementation, fetch from database
      const cheque = {
        chequeId,
        chequeNumber: 'CHQ_123456',
        payeeName: 'John Doe',
        amount: 50000,
        chequeDate: new Date(),
        status: 'Cleared',
        issuedDate: new Date(),
        clearedDate: new Date(),
        daysOutstanding: 5,
      };

      logger.info('Cheque status retrieved', {
        chequeId,
        status: cheque.status,
      });

      return cheque;
    } catch (error) {
      logger.error('Error retrieving cheque status', { error: error.message, chequeId });
      const err = new Error(error.message);
      err.status = 404;
      throw err;
    }
  }

  /**
   * Get outstanding cheques
   * @param {string} bankAccountId - Bank account ID
   * @param {Object} filters - { limit, daysOutstanding, minAmount }
   * @returns {Promise<Array>} - Outstanding cheques
   */
  static async getOutstandingCheques(bankAccountId, filters = {}) {
    try {
      const { limit = 50, daysOutstanding, minAmount } = filters;

      if (!bankAccountId) {
        throw new Error('Bank Account ID is required');
      }

      // In real implementation, query from database
      const outstanding = [
        {
          chequeId: 'CHEQUE_001',
          chequeNumber: 'CHQ_123456',
          payeeName: 'Vendor A',
          amount: 50000,
          chequeDate: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
          status: 'Issued',
          daysOutstanding: 30,
        },
        {
          chequeId: 'CHEQUE_002',
          chequeNumber: 'CHQ_123457',
          payeeName: 'Vendor B',
          amount: 25000,
          chequeDate: new Date(new Date().getTime() - 15 * 24 * 60 * 60 * 1000),
          status: 'Issued',
          daysOutstanding: 15,
        },
      ];

      logger.info('Outstanding cheques retrieved', {
        bankAccountId,
        totalCheques: outstanding.length,
      });

      return outstanding.slice(0, limit);
    } catch (error) {
      logger.error('Error retrieving outstanding cheques', {
        error: error.message,
        bankAccountId,
      });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get cheque history
   * @param {string} bankAccountId - Bank account ID
   * @param {Object} filters - { limit, fromDate, toDate, status }
   * @returns {Promise<Array>} - Cheque history
   */
  static async getChequeHistory(bankAccountId, filters = {}) {
    try {
      const { limit = 50, fromDate, toDate, status } = filters;

      if (!bankAccountId) {
        throw new Error('Bank Account ID is required');
      }

      // In real implementation, query from database
      let history = [
        {
          chequeId: 'CHEQUE_001',
          chequeNumber: 'CHQ_123456',
          payeeName: 'Vendor A',
          amount: 50000,
          chequeDate: new Date(),
          status: 'Cleared',
          issuedDate: new Date(),
          clearedDate: new Date(),
        },
        {
          chequeId: 'CHEQUE_002',
          chequeNumber: 'CHQ_123457',
          payeeName: 'Vendor B',
          amount: 25000,
          chequeDate: new Date(),
          status: 'Issued',
          issuedDate: new Date(),
        },
      ];

      if (status) {
        history = history.filter((c) => c.status === status);
      }

      logger.info('Cheque history retrieved', {
        bankAccountId,
        totalCheques: history.length,
      });

      return history.slice(0, limit);
    } catch (error) {
      logger.error('Error retrieving cheque history', {
        error: error.message,
        bankAccountId,
      });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get bounced cheques
   * @param {Object} filters - { limit, fromDate, toDate, bankAccountId }
   * @returns {Promise<Array>} - Bounced cheques
   */
  static async getBouncedCheques(filters = {}) {
    try {
      const { limit = 50, fromDate, toDate, bankAccountId } = filters;

      // In real implementation, query from database
      const bounced = [
        {
          chequeId: 'CHEQUE_001',
          bounceId: 'BOUNCE_001',
          chequeNumber: 'CHQ_123456',
          payeeName: 'Vendor A',
          amount: 50000,
          bounceDate: new Date(),
          bounceReason: 'InsufficientFunds',
          bounceCharges: 500,
          status: 'Bounced',
        },
      ];

      logger.info('Bounced cheques retrieved', {
        totalBounced: bounced.length,
      });

      return bounced.slice(0, limit);
    } catch (error) {
      logger.error('Error retrieving bounced cheques', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get cheque statistics
   * @param {string} bankAccountId - Bank account ID
   * @param {Object} filters - { fromDate, toDate }
   * @returns {Promise<Object>} - Cheque statistics
   */
  static async getChequeStatistics(bankAccountId, filters = {}) {
    try {
      const { fromDate, toDate } = filters;

      if (!bankAccountId) {
        throw new Error('Bank Account ID is required');
      }

      // In real implementation, aggregate from database
      const stats = {
        bankAccountId,
        period: { fromDate, toDate },
        totalCheques: 150,
        issuedCheques: 80,
        clearedCheques: 65,
        bouncedCheques: 3,
        outstandingCheques: 2,
        totalIssuedAmount: 5000000,
        totalClearedAmount: 4500000,
        totalBounceCharges: 1500,
        averageChequeAmount: 33333,
        clearanceRate: 81.25,
        bounceRate: 2.0,
        averageClearingTime: 7.2,
      };

      logger.info('Cheque statistics retrieved', {
        bankAccountId,
        bounceRate: stats.bounceRate,
      });

      return stats;
    } catch (error) {
      logger.error('Error retrieving cheque statistics', {
        error: error.message,
        bankAccountId,
      });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Reissue bounced cheque
   * @param {string} originalChequeId - Original cheque ID
   * @param {Object} reissueData - { newAmount, description }
   * @returns {Promise<Object>} - Reissued cheque
   */
  static async reissueBouncedCheque(originalChequeId, reissueData) {
    try {
      if (!originalChequeId) {
        throw new Error('Original Cheque ID is required');
      }

      const { newAmount, description } = reissueData;

      // In real implementation, create new cheque and link to original
      const reissued = {
        chequeId: `CHEQUE_${new Date().getTime()}`,
        chequeNumber: `CHQ_${Math.floor(Math.random() * 1000000)
          .toString()
          .padStart(6, '0')}`,
        originalChequeId,
        amount: newAmount,
        description,
        status: 'Issued',
        issuedDate: new Date(),
        glReversalEntry: { journalId: 'JE_ORIG_REVERSAL', status: 'Posted' },
        glNewEntry: { journalId: 'JE_NEW', status: 'Posted' },
      };

      logger.info('Cheque reissued', {
        chequeId: reissued.chequeId,
        originalChequeId,
        newAmount,
      });

      return reissued;
    } catch (error) {
      logger.error('Error reissuing cheque', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }
}

export default ChequeManagementService;
