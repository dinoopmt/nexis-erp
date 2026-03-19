import logger from '../../../config/logger.js';
import { AppError } from '../../../config/errorHandler.js';

/**
 * PaymentService
 * Handles payment creation, processing, and tracking
 * Manages payment status, allocation, and reconciliation
 */
class PaymentService {
  /**
   * Create payment (outgoing)
   * @param {Object} paymentData - { payeeId, payeeType, amount, paymentMethod, dueDate, description, invoices, referenceNo }
   * @returns {Promise<Object>} - Created payment record
   */
  static async createPayment(paymentData) {
    try {
      const {
        payeeId,
        payeeType,
        amount,
        paymentMethod,
        dueDate,
        description,
        invoices,
        referenceNo,
      } = paymentData;

      if (!payeeId || !payeeType || !amount || !paymentMethod) {
        throw new Error('Payee ID, Type, Amount, and Payment Method are required');
      }

      const validMethods = ['Cheque', 'BankTransfer', 'CreditCard', 'Wallet', 'Cash', 'NEFT', 'RTGS', 'IMPS'];
      if (!validMethods.includes(paymentMethod)) {
        throw new Error(`Invalid payment method. Valid methods: ${validMethods.join(', ')}`);
      }

      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      const payment = {
        paymentId: `PAY_${new Date().getTime()}`,
        payeeId,
        payeeType,
        amount,
        paymentMethod,
        dueDate,
        description,
        invoices: invoices || [],
        referenceNo: referenceNo || `REF_${new Date().getTime()}`,
        status: 'Draft',
        createdDate: new Date(),
        processedDate: null,
        paymentGatewayId: null,
        transactionRef: null,
        glEntry: null,
      };

      logger.info('Payment created', {
        paymentId: payment.paymentId,
        payeeId,
        amount,
        paymentMethod,
        status: 'Draft',
      });

      return payment;
    } catch (error) {
      logger.error('Error creating payment', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Process payment (move from draft to processed)
   * @param {string} paymentId - Payment ID
   * @param {Object} processingData - { approvedBy, accountNumber, bankCode, notes }
   * @returns {Promise<Object>} - Processed payment
   */
  static async processPayment(paymentId, processingData) {
    try {
      if (!paymentId) {
        throw new Error('Payment ID is required');
      }

      const { approvedBy, accountNumber, bankCode, notes } = processingData;

      // In real implementation, fetch payment from database
      const processed = {
        paymentId,
        status: 'Processed',
        processedDate: new Date(),
        approvedBy,
        accountNumber,
        bankCode,
        notes,
        transactionRef: `TXN_${new Date().getTime()}`,
        glStatus: 'Posted',
      };

      logger.info('Payment processed', {
        paymentId,
        status: 'Processed',
        approvedBy,
      });

      return processed;
    } catch (error) {
      logger.error('Error processing payment', { error: error.message, paymentId });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Allocate payment to invoices
   * @param {string} paymentId - Payment ID
   * @param {Array} allocations - Array of { invoiceId, allocatedAmount }
   * @returns {Promise<Object>} - Allocation result
   */
  static async allocatePaymentToInvoices(paymentId, allocations) {
    try {
      if (!paymentId || !allocations || allocations.length === 0) {
        throw new Error('Payment ID and allocations are required');
      }

      const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);

      // In real implementation, validate against payment amount
      if (totalAllocated > 100000) {
        throw new Error('Allocated amount exceeds payment amount');
      }

      const result = {
        paymentId,
        allocationId: `ALLOC_${new Date().getTime()}`,
        allocations,
        totalAllocated,
        allocatedAt: new Date(),
        status: 'Allocated',
      };

      logger.info('Payment allocated to invoices', {
        paymentId,
        invoiceCount: allocations.length,
        totalAllocated,
      });

      return result;
    } catch (error) {
      logger.error('Error allocating payment', { error: error.message, paymentId });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get payment details
   * @param {string} paymentId - Payment ID
   * @returns {Promise<Object>} - Payment details
   */
  static async getPaymentDetails(paymentId) {
    try {
      if (!paymentId) {
        throw new Error('Payment ID is required');
      }

      // In real implementation, fetch from database
      const payment = {
        paymentId,
        payeeId: 'VEN_001',
        payeeType: 'Vendor',
        amount: 50000,
        paymentMethod: 'BankTransfer',
        status: 'Processed',
        createdDate: new Date(),
        processedDate: new Date(),
        invoices: [
          { invoiceId: 'INV_001', amount: 30000, allocatedAmount: 30000 },
          { invoiceId: 'INV_002', amount: 20000, allocatedAmount: 20000 },
        ],
        glEntry: { journalId: 'JE_001', amount: 50000 },
        transactionRef: 'TXN_12345',
      };

      logger.info('Payment details retrieved', { paymentId });

      return payment;
    } catch (error) {
      logger.error('Error retrieving payment details', { error: error.message, paymentId });
      const err = new Error(error.message);
      err.status = 404;
      throw err;
    }
  }

  /**
   * Get payments by status
   * @param {string} status - Payment status
   * @param {Object} filters - { limit, fromDate, toDate, payeeType }
   * @returns {Promise<Array>} - Payments
   */
  static async getPaymentsByStatus(status, filters = {}) {
    try {
      const { limit = 50, fromDate, toDate, payeeType } = filters;

      const validStatuses = ['Draft', 'Processed', 'Cleared', 'Cancelled', 'Reversed'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status. Valid statuses: ${validStatuses.join(', ')}`);
      }

      // In real implementation, query from database
      const payments = [
        {
          paymentId: 'PAY_001',
          payeeId: 'VEN_001',
          payeeType: 'Vendor',
          amount: 50000,
          paymentMethod: 'BankTransfer',
          status,
          createdDate: new Date(),
        },
        {
          paymentId: 'PAY_002',
          payeeId: 'VEN_002',
          payeeType: 'Vendor',
          amount: 25000,
          paymentMethod: 'Cheque',
          status,
          createdDate: new Date(),
        },
      ];

      logger.info('Payments retrieved by status', {
        status,
        totalPayments: payments.length,
      });

      return payments.slice(0, limit);
    } catch (error) {
      logger.error('Error retrieving payments by status', { error: error.message, status });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Cancel payment
   * @param {string} paymentId - Payment ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} - Cancelled payment
   */
  static async cancelPayment(paymentId, reason) {
    try {
      if (!paymentId) {
        throw new Error('Payment ID is required');
      }

      // In real implementation, update payment in database
      const cancelled = {
        paymentId,
        status: 'Cancelled',
        cancelledDate: new Date(),
        cancelReason: reason,
        glReversalEntry: { journalId: 'JE_REVERSAL', status: 'Posted' },
      };

      logger.warn('Payment cancelled', {
        paymentId,
        reason,
      });

      return cancelled;
    } catch (error) {
      logger.error('Error cancelling payment', { error: error.message, paymentId });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get payment summary by date range
   * @param {Object} filters - { fromDate, toDate, payeeType, paymentMethod }
   * @returns {Promise<Object>} - Payment summary
   */
  static async getPaymentSummary(filters = {}) {
    try {
      const { fromDate, toDate, payeeType, paymentMethod } = filters;

      // In real implementation, aggregate from database
      const summary = {
        period: { fromDate, toDate },
        totalPayments: 245,
        totalAmount: 5250000,
        avgPaymentAmount: 21428,
        byStatus: {
          Draft: { count: 15, amount: 350000 },
          Processed: { count: 180, amount: 4200000 },
          Cleared: { count: 45, amount: 650000 },
          Cancelled: { count: 5, amount: 50000 },
        },
        byPaymentMethod: [
          { method: 'BankTransfer', count: 120, amount: 2800000 },
          { method: 'Cheque', count: 80, amount: 1850000 },
          { method: 'NEFT', count: 30, amount: 450000 },
          { method: 'RTGS', count: 15, amount: 150000 },
        ],
        topPayees: [
          { payeeId: 'VEN_001', name: 'Vendor A', amount: 500000 },
          { payeeId: 'VEN_002', name: 'Vendor B', amount: 420000 },
          { payeeId: 'VEN_003', name: 'Vendor C', amount: 380000 },
        ],
      };

      logger.info('Payment summary retrieved', {
        totalPayments: summary.totalPayments,
        totalAmount: summary.totalAmount,
      });

      return summary;
    } catch (error) {
      logger.error('Error retrieving payment summary', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Reverse payment
   * @param {string} paymentId - Original payment ID
   * @param {string} reason - Reversal reason
   * @returns {Promise<Object>} - Reversal record
   */
  static async reversePayment(paymentId, reason) {
    try {
      if (!paymentId) {
        throw new Error('Payment ID is required');
      }

      const reversal = {
        reversalId: `REV_${new Date().getTime()}`,
        originalPaymentId: paymentId,
        status: 'Reversed',
        reversedDate: new Date(),
        reversalReason: reason,
        glReversalEntry: { journalId: 'JE_REV', status: 'Posted' },
        reversalRefundStatus: 'Initiated',
      };

      logger.warn('Payment reversed', {
        paymentId,
        reversalId: reversal.reversalId,
        reason,
      });

      return reversal;
    } catch (error) {
      logger.error('Error reversing payment', { error: error.message, paymentId });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }
}

export default PaymentService;
