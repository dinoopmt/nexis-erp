/**
 * Purchase Return Service
 * Handles returns to vendors and credit note management
 */

import JournalEntry from '../../../Models/JournalEntry.js';
import SequenceModel from '../../../Models/SequenceModel.js';
import logger from '../../../config/logger.js';

class PurchaseReturnService {
  /**
   * Generate purchase return number
   * Format: PRET-000001, PRET-000002...
   */
  async generateReturnNumber() {
    try {
      const sequence = await SequenceModel.findOneAndUpdate(
        { name: 'PURCHASE_RETURN' },
        { $inc: { value: 1 } },
        { new: true, upsert: true }
      );

      return `PRET-${String(sequence.value).padStart(6, '0')}`;
    } catch (error) {
      logger.error('Error generating return number', { error });
      throw error;
    }
  }

  /**
   * Validate return items
   */
  validateReturnItems(items) {
    try {
      if (!Array.isArray(items) || items.length === 0) {
        const error = new Error('At least one item is required for return');
        error.status = 400;
        throw error;
      }

      items.forEach((item, index) => {
        if (!item.invoiceNumber || !item.invoiceNumber.trim()) {
          const error = new Error(`Item ${index + 1}: Invoice number is required`);
          error.status = 400;
          throw error;
        }
        if (!item.description || !item.description.trim()) {
          const error = new Error(`Item ${index + 1}: Description is required`);
          error.status = 400;
          throw error;
        }
        if (!item.quantity || item.quantity <= 0) {
          const error = new Error(`Item ${index + 1}: Quantity must be greater than 0`);
          error.status = 400;
          throw error;
        }
        if (item.unitPrice === undefined || item.unitPrice < 0) {
          const error = new Error(`Item ${index + 1}: Unit price is required`);
          error.status = 400;
          throw error;
        }
        if (!item.reason || !item.reason.trim()) {
          const error = new Error(`Item ${index + 1}: Return reason is required`);
          error.status = 400;
          throw error;
        }
      });

      return true;
    } catch (error) {
      logger.error('Error validating return items', { error });
      throw error;
    }
  }

  /**
   * Calculate return totals
   */
  calculateReturnTotals(items, taxPercentage = 18) {
    try {
      let subtotal = 0;
      let totalQuantity = 0;

      items.forEach(item => {
        subtotal += Math.round(item.quantity * item.unitPrice);
        totalQuantity += item.quantity;
      });

      const taxAmount = Math.round(subtotal * (taxPercentage / 100));
      const total = subtotal + taxAmount;

      return {
        subtotal,
        taxPercentage,
        taxAmount,
        total,
        totalQuantity,
      };
    } catch (error) {
      logger.error('Error calculating return totals', { error });
      throw error;
    }
  }

  /**
   * Create purchase return
   */
  async createPurchaseReturn(returnData) {
    try {
      const {
        vendorId,
        vendorName,
        items,
        returnDate,
        taxPercentage,
        notes,
      } = returnData;

      // Validation
      if (!vendorId) {
        const error = new Error('Vendor ID is required');
        error.status = 400;
        throw error;
      }

      if (!vendorName || !vendorName.trim()) {
        const error = new Error('Vendor name is required');
        error.status = 400;
        throw error;
      }

      if (!returnDate) {
        const error = new Error('Return date is required');
        error.status = 400;
        throw error;
      }

      // Validate items
      this.validateReturnItems(items);

      // Calculate totals
      const totals = this.calculateReturnTotals(items, taxPercentage || 18);

      // Generate return number
      const returnNumber = await this.generateReturnNumber();

      const purchaseReturn = {
        returnNumber,
        vendorId,
        vendorName: vendorName.trim(),
        returnDate: new Date(returnDate),
        items: items.map(item => ({
          invoiceNumber: item.invoiceNumber.trim(),
          description: item.description.trim(),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.quantity * item.unitPrice,
          reason: item.reason.trim(),
          condition: item.condition || 'Damaged',
        })),
        subtotal: totals.subtotal,
        taxPercentage: totals.taxPercentage,
        taxAmount: totals.taxAmount,
        totalAmount: totals.total,
        totalQuantity: totals.totalQuantity,
        status: 'Initiated',
        creditNoteStatus: 'Pending',
        creditNoteNumber: null,
        creditNoteAmount: 0,
        approvedAt: null,
        approvedBy: null,
        receivedAt: null,
        receivedByVendor: null,
        creditNotedAt: null,
        creditNotedBy: null,
        notes: notes?.trim() || '',
        createdAt: new Date(),
        createdBy: returnData.createdBy || 'system',
        isDeleted: false,
      };

      logger.info('Purchase return created', {
        returnNumber,
        vendorId,
        totalAmount: totals.total,
      });

      return purchaseReturn;
    } catch (error) {
      logger.error('Error creating purchase return', { error });
      throw error;
    }
  }

  /**
   * Approve purchase return
   */
  async approvePurchaseReturn(purchaseReturn, approvedBy) {
    try {
      if (!purchaseReturn) {
        const error = new Error('Purchase return not found');
        error.status = 404;
        throw error;
      }

      if (purchaseReturn.status !== 'Initiated') {
        const error = new Error('Only initiated returns can be approved');
        error.status = 409;
        throw error;
      }

      purchaseReturn.status = 'Approved';
      purchaseReturn.approvedAt = new Date();
      purchaseReturn.approvedBy = approvedBy;

      logger.info('Purchase return approved', {
        returnNumber: purchaseReturn.returnNumber,
        approvedBy,
      });

      return purchaseReturn;
    } catch (error) {
      logger.error('Error approving purchase return', { error });
      throw error;
    }
  }

  /**
   * Mark return as received by vendor
   */
  async markReturnReceived(purchaseReturn, receivedByVendor) {
    try {
      if (!purchaseReturn) {
        const error = new Error('Purchase return not found');
        error.status = 404;
        throw error;
      }

      if (purchaseReturn.status !== 'Approved') {
        const error = new Error('Only approved returns can be marked as received');
        error.status = 409;
        throw error;
      }

      purchaseReturn.status = 'Received';
      purchaseReturn.receivedAt = new Date();
      purchaseReturn.receivedByVendor = receivedByVendor;

      logger.info('Purchase return marked as received', {
        returnNumber: purchaseReturn.returnNumber,
        receivedByVendor,
      });

      return purchaseReturn;
    } catch (error) {
      logger.error('Error marking return as received', { error });
      throw error;
    }
  }

  /**
   * Create credit note for return
   */
  async createCreditNote(purchaseReturn, creditNoteData, createdBy) {
    try {
      if (!purchaseReturn) {
        const error = new Error('Purchase return not found');
        error.status = 404;
        throw error;
      }

      if (purchaseReturn.creditNoteStatus === 'Credited') {
        const error = new Error('Credit note already issued for this return');
        error.status = 409;
        throw error;
      }

      // Generate credit note number
      const sequence = await SequenceModel.findOneAndUpdate(
        { name: 'CREDIT_NOTE' },
        { $inc: { value: 1 } },
        { new: true, upsert: true }
      );

      const creditNoteNumber = `CN-${String(sequence.value).padStart(6, '0')}`;

      purchaseReturn.creditNoteStatus = 'Credited';
      purchaseReturn.creditNoteNumber = creditNoteNumber;
      purchaseReturn.creditNoteAmount = creditNoteData.creditAmount || purchaseReturn.totalAmount;
      purchaseReturn.creditNotedAt = new Date();
      purchaseReturn.creditNotedBy = createdBy;

      // Create journal entry for credit note
      const journalEntry = {
        referenceNumber: creditNoteNumber,
        referenceType: 'CREDIT_NOTE',
        description: `Credit Note for Return ${purchaseReturn.returnNumber}`,
        entries: [
          {
            accountName: 'Accounts Payable',
            debit: purchaseReturn.creditNoteAmount,
            credit: 0,
          },
          {
            accountName: 'Expense/Cost of Goods',
            debit: 0,
            credit: Math.round((purchaseReturn.creditNoteAmount * 100) / 118), // Reverse COGS
          },
          {
            accountName: 'Input Tax Credit',
            debit: 0,
            credit: Math.round(purchaseReturn.creditNoteAmount - ((purchaseReturn.creditNoteAmount * 100) / 118)), // Reverse ITC
          },
        ],
        totalDebit: purchaseReturn.creditNoteAmount,
        totalCredit: purchaseReturn.creditNoteAmount,
        balanced: true,
        createdBy,
        createdAt: new Date(),
      };

      await JournalEntry.create(journalEntry);

      logger.info('Credit note created for purchase return', {
        returnNumber: purchaseReturn.returnNumber,
        creditNoteNumber,
        creditAmount: purchaseReturn.creditNoteAmount,
        createdBy,
      });

      return purchaseReturn;
    } catch (error) {
      logger.error('Error creating credit note', { error });
      throw error;
    }
  }

  /**
   * Cancel purchase return
   */
  async cancelPurchaseReturn(purchaseReturn, cancelReason, cancelledBy) {
    try {
      if (!purchaseReturn) {
        const error = new Error('Purchase return not found');
        error.status = 404;
        throw error;
      }

      if (purchaseReturn.creditNoteStatus === 'Credited') {
        const error = new Error('Cannot cancel return with issued credit note');
        error.status = 409;
        throw error;
      }

      purchaseReturn.status = 'Cancelled';
      purchaseReturn.cancelReason = cancelReason;
      purchaseReturn.cancelledAt = new Date();
      purchaseReturn.cancelledBy = cancelledBy;

      logger.info('Purchase return cancelled', {
        returnNumber: purchaseReturn.returnNumber,
        reason: cancelReason,
        cancelledBy,
      });

      return purchaseReturn;
    } catch (error) {
      logger.error('Error cancelling purchase return', { error });
      throw error;
    }
  }

  /**
   * Get pending credit notes
   */
  getPendingCreditNotes(returns) {
    try {
      return returns.filter(ret =>
        ret.creditNoteStatus === 'Pending' &&
        ret.status === 'Received' &&
        !ret.isDeleted
      );
    } catch (error) {
      logger.error('Error getting pending credit notes', { error });
      throw error;
    }
  }

  /**
   * Get return statistics
   */
  getReturnStatistics(returns, vendorId = null) {
    try {
      const filteredReturns = vendorId
        ? returns.filter(ret => ret.vendorId === vendorId && !ret.isDeleted)
        : returns.filter(ret => !ret.isDeleted);

      const stats = {
        totalReturns: filteredReturns.length,
        totalReturnValue: 0,
        totalReturnQuantity: 0,
        byStatus: {
          Initiated: 0,
          Approved: 0,
          Received: 0,
          Cancelled: 0,
        },
        creditNotesIssued: 0,
        pendingCreditNotes: 0,
      };

      filteredReturns.forEach(ret => {
        stats.totalReturnValue += ret.totalAmount || 0;
        stats.totalReturnQuantity += ret.totalQuantity || 0;
        stats.byStatus[ret.status] = (stats.byStatus[ret.status] || 0) + 1;

        if (ret.creditNoteStatus === 'Credited') {
          stats.creditNotesIssued++;
        } else if (ret.creditNoteStatus === 'Pending' && ret.status === 'Received') {
          stats.pendingCreditNotes++;
        }
      });

      return stats;
    } catch (error) {
      logger.error('Error getting return statistics', { error });
      throw error;
    }
  }

  /**
   * Get returns by reason
   */
  getReturnsByReason(returns) {
    try {
      const reasonMap = {};

      returns.forEach(ret => {
        if (ret.items) {
          ret.items.forEach(item => {
            const reason = item.reason || 'Unknown';
            if (!reasonMap[reason]) {
              reasonMap[reason] = {
                reason,
                count: 0,
                totalQuantity: 0,
                totalValue: 0,
              };
            }
            reasonMap[reason].count++;
            reasonMap[reason].totalQuantity += item.quantity;
            reasonMap[reason].totalValue += item.lineTotal;
          });
        }
      });

      return Object.values(reasonMap);
    } catch (error) {
      logger.error('Error getting returns by reason', { error });
      throw error;
    }
  }

  /**
   * Get vendor return history
   */
  getVendorReturnHistory(returns, vendorId) {
    try {
      const vendorReturns = returns.filter(ret =>
        ret.vendorId === vendorId && !ret.isDeleted
      );

      return {
        vendorId,
        totalReturns: vendorReturns.length,
        totalReturnValue: vendorReturns.reduce((sum, ret) => sum + (ret.totalAmount || 0), 0),
        totalReturnQuantity: vendorReturns.reduce((sum, ret) => sum + (ret.totalQuantity || 0), 0),
        returns: vendorReturns.sort((a, b) => new Date(b.returnDate) - new Date(a.returnDate)),
      };
    } catch (error) {
      logger.error('Error getting vendor return history', { vendorId, error });
      throw error;
    }
  }
}

export default new PurchaseReturnService();
