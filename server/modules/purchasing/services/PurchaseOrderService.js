/**
 * Purchase Order Service
 * Handles purchase order creation, tracking, and workflow management
 */

import JournalEntry from '../../../Models/JournalEntry.js';
import SequenceModel from '../../../Models/SequenceModel.js';
import logger from '../../../config/logger.js';

class PurchaseOrderService {
  /**
   * Generate next PO number
   * Format: PO-000001, PO-000002...
   */
  async generatePONumber() {
    try {
      const sequence = await SequenceModel.findOneAndUpdate(
        { name: 'PO' },
        { $inc: { value: 1 } },
        { new: true, upsert: true }
      );

      return `PO-${String(sequence.value).padStart(6, '0')}`;
    } catch (error) {
      logger.error('Error generating PO number', { error });
      throw error;
    }
  }

  /**
   * Validate PO items
   */
  validatePOItems(items) {
    try {
      if (!Array.isArray(items) || items.length === 0) {
        const error = new Error('At least one item is required');
        error.status = 400;
        throw error;
      }

      items.forEach((item, index) => {
        if (!item.productId) {
          const error = new Error(`Item ${index + 1}: Product ID is required`);
          error.status = 400;
          throw error;
        }
        if (!item.quantity || item.quantity <= 0) {
          const error = new Error(`Item ${index + 1}: Quantity must be greater than 0`);
          error.status = 400;
          throw error;
        }
        if (!item.unitPrice || item.unitPrice < 0) {
          const error = new Error(`Item ${index + 1}: Unit price is required and must be non-negative`);
          error.status = 400;
          throw error;
        }
      });

      return true;
    } catch (error) {
      logger.error('Error validating PO items', { error });
      throw error;
    }
  }

  /**
   * Calculate PO totals
   */
  calculatePOTotals(items) {
    try {
      let subtotal = 0;
      let totalQuantity = 0;

      items.forEach(item => {
        const itemTotal = Math.round(item.quantity * item.unitPrice);
        subtotal += itemTotal;
        totalQuantity += item.quantity;
      });

      const taxAmount = Math.round(subtotal * 0.18); // 18% GST
      const total = subtotal + taxAmount;

      return {
        subtotal,
        taxAmount,
        total,
        totalQuantity,
      };
    } catch (error) {
      logger.error('Error calculating PO totals', { error });
      throw error;
    }
  }

  /**
   * Create purchase order
   */
  async createPurchaseOrder(poData) {
    try {
      const { vendorId, vendorName, referenceNumber, items, notes, deliveryDate } = poData;

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

      // Validate and process items
      this.validatePOItems(items);

      // Calculate totals
      const totals = this.calculatePOTotals(items);

      // Generate PO number
      const poNumber = await this.generatePONumber();

      // Create PO document (storing in a structured format)
      const purchaseOrder = {
        poNumber,
        vendorId,
        vendorName: vendorName.trim(),
        referenceNumber: referenceNumber?.trim() || '',
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.quantity * item.unitPrice,
          description: item.description || '',
        })),
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        totalAmount: totals.total,
        totalQuantity: totals.totalQuantity,
        status: 'Draft',
        notes: notes?.trim() || '',
        deliveryDate: deliveryDate || null,
        createdAt: new Date(),
        createdBy: poData.createdBy || 'system',
        approvedAt: null,
        approvedBy: null,
        receivedAt: null,
        receivedBy: null,
        cancelledAt: null,
        cancelledBy: null,
        cancelReason: null,
        isDeleted: false,
      };

      logger.info('Purchase order created', {
        poNumber,
        vendorId,
        totalAmount: totals.total,
      });

      return purchaseOrder;
    } catch (error) {
      logger.error('Error creating purchase order', { error });
      throw error;
    }
  }

  /**
   * Approve purchase order
   */
  async approvePurchaseOrder(purchaseOrder, approvedBy) {
    try {
      if (!purchaseOrder) {
        const error = new Error('Purchase order not found');
        error.status = 404;
        throw error;
      }

      if (purchaseOrder.status !== 'Draft') {
        const error = new Error('Only Draft POs can be approved');
        error.status = 409;
        throw error;
      }

      purchaseOrder.status = 'Approved';
      purchaseOrder.approvedAt = new Date();
      purchaseOrder.approvedBy = approvedBy;

      logger.info('Purchase order approved', {
        poNumber: purchaseOrder.poNumber,
        approvedBy,
      });

      return purchaseOrder;
    } catch (error) {
      logger.error('Error approving purchase order', { error });
      throw error;
    }
  }

  /**
   * Update PO status
   */
  updatePOStatus(purchaseOrder, newStatus) {
    try {
      const validStatuses = ['Draft', 'Approved', 'Partial', 'Received', 'Cancelled'];
      
      if (!validStatuses.includes(newStatus)) {
        const error = new Error(`Status must be one of: ${validStatuses.join(', ')}`);
        error.status = 400;
        throw error;
      }

      purchaseOrder.status = newStatus;

      logger.info('PO status updated', {
        poNumber: purchaseOrder.poNumber,
        newStatus,
      });

      return purchaseOrder;
    } catch (error) {
      logger.error('Error updating PO status', { error });
      throw error;
    }
  }

  /**
   * Receive purchase order and create journal entries
   */
  async receivePurchaseOrder(purchaseOrder, receivedBy) {
    try {
      if (!purchaseOrder) {
        const error = new Error('Purchase order not found');
        error.status = 404;
        throw error;
      }

      if (purchaseOrder.status === 'Cancelled') {
        const error = new Error('Cannot receive cancelled PO');
        error.status = 409;
        throw error;
      }

      if (purchaseOrder.status === 'Received') {
        const error = new Error('PO already received');
        error.status = 409;
        throw error;
      }

      purchaseOrder.status = 'Received';
      purchaseOrder.receivedAt = new Date();
      purchaseOrder.receivedBy = receivedBy;

      // Create journal entries for purchase
      // Debit: Inventory/Expense, Credit: Accounts Payable
      const journalEntry = {
        referenceNumber: purchaseOrder.poNumber,
        referenceType: 'PURCHASE_ORDER',
        description: `Purchase from ${purchaseOrder.vendorName}`,
        entries: [
          {
            accountName: 'Inventory/Stock',
            debit: purchaseOrder.totalAmount,
            credit: 0,
          },
          {
            accountName: 'Accounts Payable',
            debit: 0,
            credit: purchaseOrder.totalAmount,
          },
        ],
        totalDebit: purchaseOrder.totalAmount,
        totalCredit: purchaseOrder.totalAmount,
        balanced: true,
        createdBy: receivedBy,
        createdAt: new Date(),
      };

      await JournalEntry.create(journalEntry);

      logger.info('Purchase order received and accounted', {
        poNumber: purchaseOrder.poNumber,
        receivedBy,
        totalAmount: purchaseOrder.totalAmount,
      });

      return purchaseOrder;
    } catch (error) {
      logger.error('Error receiving purchase order', { error });
      throw error;
    }
  }

  /**
   * Cancel purchase order
   */
  async cancelPurchaseOrder(purchaseOrder, cancelReason, cancelledBy) {
    try {
      if (!purchaseOrder) {
        const error = new Error('Purchase order not found');
        error.status = 404;
        throw error;
      }

      if (purchaseOrder.status === 'Received') {
        const error = new Error('Cannot cancel received PO');
        error.status = 409;
        throw error;
      }

      purchaseOrder.status = 'Cancelled';
      purchaseOrder.cancelledAt = new Date();
      purchaseOrder.cancelledBy = cancelledBy;
      purchaseOrder.cancelReason = cancelReason;

      logger.info('Purchase order cancelled', {
        poNumber: purchaseOrder.poNumber,
        reason: cancelReason,
        cancelledBy,
      });

      return purchaseOrder;
    } catch (error) {
      logger.error('Error cancelling purchase order', { error });
      throw error;
    }
  }

  /**
   * Get PO summary statistics
   */
  summarizePOs(purchaseOrders) {
    try {
      const summary = {
        totalPOs: purchaseOrders.length,
        totalValue: 0,
        totalQuantity: 0,
        byStatus: {
          Draft: 0,
          Approved: 0,
          Partial: 0,
          Received: 0,
          Cancelled: 0,
        },
      };

      purchaseOrders.forEach(po => {
        summary.totalValue += po.totalAmount || 0;
        summary.totalQuantity += po.totalQuantity || 0;
        summary.byStatus[po.status] = (summary.byStatus[po.status] || 0) + 1;
      });

      return summary;
    } catch (error) {
      logger.error('Error summarizing POs', { error });
      throw error;
    }
  }

  /**
   * Get vendor PO performance metrics
   */
  getVendorPOMetrics(purchaseOrders, vendorId) {
    try {
      const vendorPOs = purchaseOrders.filter(po => po.vendorId === vendorId);

      const metrics = {
        totalPOs: vendorPOs.length,
        totalValue: 0,
        averageValue: 0,
        receivedCount: 0,
        cancelledCount: 0,
        pendingCount: 0,
      };

      vendorPOs.forEach(po => {
        metrics.totalValue += po.totalAmount || 0;
        if (po.status === 'Received') metrics.receivedCount++;
        if (po.status === 'Cancelled') metrics.cancelledCount++;
        if (['Draft', 'Approved', 'Partial'].includes(po.status)) metrics.pendingCount++;
      });

      metrics.averageValue = metrics.totalPOs > 0 ? Math.round(metrics.totalValue / metrics.totalPOs) : 0;

      return metrics;
    } catch (error) {
      logger.error('Error getting vendor PO metrics', { vendorId, error });
      throw error;
    }
  }
}

export default new PurchaseOrderService();
