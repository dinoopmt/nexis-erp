/**
 * Sales Return Service
 * Handles business logic for sales returns, refunds, and return processing
 */

import SalesReturn from '../../../Models/Sales/SalesReturn.js';
import SalesInvoice from '../../../Models/Sales/SalesInvoice.js';
import Counter from '../../../Models/SequenceModel.js';
import Product from '../../../Models/Product.js';
import logger from '../../../config/logger.js';

class SalesReturnService {
  /**
   * Generate next return number
   * @param {string} financialYear - Financial year
   * @returns {Promise<string>} - Generated return number (e.g., "SR/2024-2025/0001")
   */
  async getNextReturnNumber(financialYear) {
    try {
      if (!financialYear) {
        const error = new Error('Financial year is required');
        error.status = 400;
        throw error;
      }

      const counter = await Counter.findOneAndUpdate(
        { module: 'sales_return', financialYear },
        { $inc: { lastNumber: 1 }, $setOnInsert: { prefix: 'SR' } },
        { returnDocument: 'after', upsert: true }
      );

      const paddedNumber = String(counter.lastNumber).padStart(4, '0');
      const returnNumber = `SR/${financialYear}/${paddedNumber}`;

      logger.info('Generated sales return number', { returnNumber, financialYear });
      return returnNumber;
    } catch (err) {
      logger.error('Failed to generate return number', { error: err.message, financialYear });
      throw err;
    }
  }

  /**
   * Validate return data
   * @param {Object} returnData - Return details
   * @returns {boolean} - true if valid
   */
  validateReturnData(returnData) {
    const { returnNumber, invoiceId, items, reason } = returnData;

    if (!returnNumber || !invoiceId || !items || items.length === 0) {
      const error = new Error('Missing required fields: returnNumber, invoiceId, items');
      error.status = 400;
      throw error;
    }

    // Validate reason minimum length
    if (reason && reason.length < 5) {
      const error = new Error('Return reason must be at least 5 characters');
      error.status = 400;
      throw error;
    }

    return true;
  }

  /**
   * Create a new sales return
   * @param {Object} returnData - Return details
   * @returns {Promise<Object>} - Created return with details
   */
  async createSalesReturn(returnData) {
    try {
      this.validateReturnData(returnData);

      // Verify invoice exists
      const invoice = await SalesInvoice.findById(returnData.invoiceId);
      if (!invoice) {
        const error = new Error('Referenced invoice not found');
        error.status = 404;
        throw error;
      }

      const salesReturn = new SalesReturn(returnData);
      await salesReturn.save();

      logger.info('Sales return created', { returnId: salesReturn._id, returnNumber: salesReturn.returnNumber });

      // Update stock levels if return is approved
      if (returnData.status === 'Approved') {
        await this.processReturnStock(salesReturn);
      }

      return salesReturn;
    } catch (err) {
      logger.error('Failed to create sales return', { error: err.message });
      throw err;
    }
  }

  /**
   * Process return and update stock levels
   * @param {Object} salesReturn - Sales return document
   * @returns {Promise<void>}
   */
  async processReturnStock(salesReturn) {
    try {
      for (const item of salesReturn.items) {
        const product = await Product.findById(item.productId);
        if (product) {
          // Add back quantity to stock
          product.quantityInStock = (product.quantityInStock || 0) + (item.quantity || 1);
          await product.save();
          logger.info('Product stock updated on return', { productId: item.productId, quantityAdded: item.quantity });
        }
      }
    } catch (err) {
      logger.warn('Failed to process return stock', { error: err.message, returnId: salesReturn._id });
      // Don't fail the return creation if stock update fails
    }
  }

  /**
   * Get return by ID
   * @param {string} returnId - Return ID
   * @returns {Promise<Object>} - Return with populated details
   */
  async getReturnById(returnId) {
    try {
      const salesReturn = await SalesReturn.findById(returnId)
        .populate('customerId')
        .populate('invoiceId')
        .populate('items.productId');

      if (!salesReturn) {
        const error = new Error('Sales return not found');
        error.status = 404;
        throw error;
      }

      logger.info('Retrieved sales return', { returnId });
      return salesReturn;
    } catch (err) {
      logger.error('Failed to get sales return', { error: err.message, returnId });
      throw err;
    }
  }

  /**
   * Get all returns with pagination and filters
   * @param {Object} filters - { customerId, status, invoiceId, startDate, endDate, page, limit }
   * @returns {Promise<Object>} - Paginated returns
   */
  async getAllReturns(filters = {}) {
    try {
      const { customerId, status, invoiceId, startDate, endDate, page = 1, limit = 20 } = filters;
      const skip = (page - 1) * limit;

      let query = { isDeleted: false };

      if (customerId) query.customerId = customerId;
      if (status) query.status = status;
      if (invoiceId) query.invoiceId = invoiceId;
      if (startDate || endDate) {
        query.returnDate = {};
        if (startDate) query.returnDate.$gte = new Date(startDate);
        if (endDate) query.returnDate.$lte = new Date(endDate);
      }

      const returns = await SalesReturn.find(query)
        .populate('customerId')
        .populate('invoiceId')
        .populate('items.productId')
        .sort({ returnDate: -1 })
        .skip(skip)
        .limit(limit);

      const total = await SalesReturn.countDocuments(query);

      logger.info('Retrieved sales returns', { count: returns.length, total, page, limit });
      return {
        returns,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (err) {
      logger.error('Failed to get sales returns', { error: err.message });
      throw err;
    }
  }

  /**
   * Update a return
   * @param {string} returnId - Return ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object>} - Updated return
   */
  async updateSalesReturn(returnId, updateData) {
    try {
      const salesReturn = await SalesReturn.findByIdAndUpdate(returnId, updateData, {
        returnDocument: 'after',
        runValidators: true,
      });

      if (!salesReturn) {
        const error = new Error('Sales return not found');
        error.status = 404;
        throw error;
      }

      logger.info('Sales return updated', { returnId, updatedFields: Object.keys(updateData) });
      return salesReturn;
    } catch (err) {
      logger.error('Failed to update sales return', { error: err.message, returnId });
      throw err;
    }
  }

  /**
   * Approve a return and process refund
   * @param {string} returnId - Return ID
   * @param {Object} approvalData - { approvedBy, notes, refundAmount }
   * @returns {Promise<Object>} - Updated return
   */
  async approveReturn(returnId, approvalData) {
    try {
      const salesReturn = await SalesReturn.findById(returnId);
      if (!salesReturn) {
        const error = new Error('Sales return not found');
        error.status = 404;
        throw error;
      }

      const updateData = {
        status: 'Approved',
        approvedBy: approvalData.approvedBy,
        approvalDate: new Date(),
        approvalNotes: approvalData.notes,
        refundAmount: approvalData.refundAmount || salesReturn.totalReturnAmount,
      };

      const updated = await SalesReturn.findByIdAndUpdate(returnId, updateData, { returnDocument: 'after' });

      // Process stock update
      await this.processReturnStock(salesReturn);

      logger.info('Sales return approved', { returnId, refundAmount: updateData.refundAmount });
      return updated;
    } catch (err) {
      logger.error('Failed to approve return', { error: err.message, returnId });
      throw err;
    }
  }

  /**
   * Reject a return
   * @param {string} returnId - Return ID
   * @param {string} rejectionReason - Reason for rejection
   * @returns {Promise<Object>} - Updated return
   */
  async rejectReturn(returnId, rejectionReason) {
    try {
      if (!rejectionReason || rejectionReason.length < 5) {
        const error = new Error('Rejection reason must be at least 5 characters');
        error.status = 400;
        throw error;
      }

      const updated = await SalesReturn.findByIdAndUpdate(
        returnId,
        {
          status: 'Rejected',
          rejectionReason,
          rejectionDate: new Date(),
        },
        { returnDocument: 'after' }
      );

      if (!updated) {
        const error = new Error('Sales return not found');
        error.status = 404;
        throw error;
      }

      logger.info('Sales return rejected', { returnId, reason: rejectionReason });
      return updated;
    } catch (err) {
      logger.error('Failed to reject return', { error: err.message, returnId });
      throw err;
    }
  }

  /**
   * Delete a return (soft delete)
   * @param {string} returnId - Return ID
   * @returns {Promise<void>}
   */
  async deleteSalesReturn(returnId) {
    try {
      const salesReturn = await SalesReturn.findByIdAndUpdate(returnId, { isDeleted: true }, { returnDocument: 'after' });

      if (!salesReturn) {
        const error = new Error('Sales return not found');
        error.status = 404;
        throw error;
      }

      logger.info('Sales return deleted (soft)', { returnId });
    } catch (err) {
      logger.error('Failed to delete sales return', { error: err.message, returnId });
      throw err;
    }
  }

  /**
   * Get pending returns (awaiting approval)
   * @returns {Promise<Array>} - Returns with status = Pending
   */
  async getPendingReturns() {
    try {
      const returns = await SalesReturn.find({ status: 'Pending', isDeleted: false })
        .populate('customerId')
        .populate('invoiceId')
        .populate('items.productId')
        .sort({ returnDate: -1 });

      logger.info('Retrieved pending returns', { count: returns.length });
      return returns;
    } catch (err) {
      logger.error('Failed to get pending returns', { error: err.message });
      throw err;
    }
  }

  /**
   * Get return summary
   * @param {Object} filters - { year, month, status }
   * @returns {Promise<Object>} - Summary data
   */
  async getReturnSummary(filters = {}) {
    try {
      const { year, month, status } = filters;
      let matchStage = { isDeleted: false };

      if (status) matchStage.status = status;
      if (year || month) {
        matchStage.returnDate = {};
        if (year) {
          const startOfYear = new Date(`${year}-01-01`);
          const endOfYear = new Date(`${year}-12-31`);
          matchStage.returnDate.$gte = startOfYear;
          matchStage.returnDate.$lte = endOfYear;
        }
        if (month && year) {
          const startOfMonth = new Date(`${year}-${String(month).padStart(2, '0')}-01`);
          const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0);
          matchStage.returnDate.$gte = startOfMonth;
          matchStage.returnDate.$lte = endOfMonth;
        }
      }

      const summary = await SalesReturn.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalRefund: { $sum: '$refundAmount' },
          },
        },
      ]);

      logger.info('Generated return summary', { filters });
      return summary;
    } catch (err) {
      logger.error('Failed to get return summary', { error: err.message });
      throw err;
    }
  }
}

export default new SalesReturnService();
