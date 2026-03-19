/**
 * Purchase Invoice Service
 * Handles vendor invoice processing, reconciliation, and payment tracking
 */

import JournalEntry from '../../../Models/JournalEntry.js';
import SequenceModel from '../../../Models/SequenceModel.js';
import logger from '../../../config/logger.js';

class PurchaseInvoiceService {
  /**
   * Generate purchase invoice number
   * Format: PINV-000001, PINV-000002...
   */
  async generateInvoiceNumber() {
    try {
      const sequence = await SequenceModel.findOneAndUpdate(
        { name: 'PURCHASE_INVOICE' },
        { $inc: { value: 1 } },
        { new: true, upsert: true }
      );

      return `PINV-${String(sequence.value).padStart(6, '0')}`;
    } catch (error) {
      logger.error('Error generating invoice number', { error });
      throw error;
    }
  }

  /**
   * Validate invoice line items
   */
  validateInvoiceItems(items) {
    try {
      if (!Array.isArray(items) || items.length === 0) {
        const error = new Error('At least one item is required');
        error.status = 400;
        throw error;
      }

      items.forEach((item, index) => {
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
          const error = new Error(`Item ${index + 1}: Unit price is required and must be non-negative`);
          error.status = 400;
          throw error;
        }
      });

      return true;
    } catch (error) {
      logger.error('Error validating invoice items', { error });
      throw error;
    }
  }

  /**
   * Calculate invoice totals with tax
   */
  calculateInvoiceTotals(items, taxPercentage = 18) {
    try {
      let subtotal = 0;

      items.forEach(item => {
        subtotal += Math.round(item.quantity * item.unitPrice);
      });

      const taxAmount = Math.round(subtotal * (taxPercentage / 100));
      const total = subtotal + taxAmount;

      return {
        subtotal,
        taxPercentage,
        taxAmount,
        total,
      };
    } catch (error) {
      logger.error('Error calculating invoice totals', { error });
      throw error;
    }
  }

  /**
   * Create purchase invoice
   */
  async createPurchaseInvoice(invoiceData) {
    try {
      const {
        vendorId,
        vendorName,
        vendorInvoiceNumber,
        invoiceDate,
        items,
        dueDate,
        taxPercentage,
        notes,
        poNumber,
      } = invoiceData;

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

      if (!vendorInvoiceNumber || !vendorInvoiceNumber.trim()) {
        const error = new Error('Vendor invoice number is required');
        error.status = 400;
        throw error;
      }

      if (!invoiceDate) {
        const error = new Error('Invoice date is required');
        error.status = 400;
        throw error;
      }

      // Validate items
      this.validateInvoiceItems(items);

      // Calculate totals
      const totals = this.calculateInvoiceTotals(items, taxPercentage || 18);

      // Generate system invoice number
      const invoiceNumber = await this.generateInvoiceNumber();

      const purchaseInvoice = {
        invoiceNumber,
        vendorId,
        vendorName: vendorName.trim(),
        vendorInvoiceNumber: vendorInvoiceNumber.trim(),
        poNumber: poNumber?.trim() || '',
        invoiceDate: new Date(invoiceDate),
        dueDate: dueDate ? new Date(dueDate) : null,
        items: items.map(item => ({
          description: item.description.trim(),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.quantity * item.unitPrice,
          hsn: item.hsn?.trim() || '',
        })),
        subtotal: totals.subtotal,
        taxPercentage: totals.taxPercentage,
        taxAmount: totals.taxAmount,
        totalAmount: totals.total,
        status: 'Pending Review',
        amountPaid: 0,
        outstandingAmount: totals.total,
        paymentStatus: 'Unpaid',
        notes: notes?.trim() || '',
        approvedAt: null,
        approvedBy: null,
        reconciliedAt: null,
        reconciliedWith: null,
        createdAt: new Date(),
        createdBy: invoiceData.createdBy || 'system',
        isDeleted: false,
      };

      logger.info('Purchase invoice created', {
        invoiceNumber,
        vendorId,
        totalAmount: totals.total,
      });

      return purchaseInvoice;
    } catch (error) {
      logger.error('Error creating purchase invoice', { error });
      throw error;
    }
  }

  /**
   * Approve purchase invoice
   */
  async approvePurchaseInvoice(invoice, approvedBy) {
    try {
      if (!invoice) {
        const error = new Error('Invoice not found');
        error.status = 404;
        throw error;
      }

      if (invoice.status !== 'Pending Review') {
        const error = new Error('Only pending invoices can be approved');
        error.status = 409;
        throw error;
      }

      invoice.status = 'Approved';
      invoice.approvedAt = new Date();
      invoice.approvedBy = approvedBy;

      // Create journal entry
      const journalEntry = {
        referenceNumber: invoice.invoiceNumber,
        referenceType: 'PURCHASE_INVOICE',
        description: `Purchase Invoice from ${invoice.vendorName}`,
        entries: [
          {
            accountName: 'Expense/Cost of Goods',
            debit: invoice.subtotal,
            credit: 0,
          },
          {
            accountName: 'Input Tax Credit',
            debit: invoice.taxAmount,
            credit: 0,
          },
          {
            accountName: 'Accounts Payable',
            debit: 0,
            credit: invoice.totalAmount,
          },
        ],
        totalDebit: invoice.totalAmount,
        totalCredit: invoice.totalAmount,
        balanced: true,
        createdBy: approvedBy,
        createdAt: new Date(),
      };

      await JournalEntry.create(journalEntry);

      logger.info('Purchase invoice approved', {
        invoiceNumber: invoice.invoiceNumber,
        approvedBy,
        totalAmount: invoice.totalAmount,
      });

      return invoice;
    } catch (error) {
      logger.error('Error approving purchase invoice', { error });
      throw error;
    }
  }

  /**
   * Record payment against invoice
   */
  async recordPayment(invoice, paymentAmount, paymentMethod, paymentDate, paidBy) {
    try {
      if (!invoice) {
        const error = new Error('Invoice not found');
        error.status = 404;
        throw error;
      }

      if (paymentAmount <= 0) {
        const error = new Error('Payment amount must be greater than 0');
        error.status = 400;
        throw error;
      }

      if (paymentAmount > invoice.outstandingAmount) {
        const error = new Error(`Payment amount exceeds outstanding amount of ${invoice.outstandingAmount}`);
        error.status = 400;
        throw error;
      }

      invoice.amountPaid += paymentAmount;
      invoice.outstandingAmount -= paymentAmount;

      if (invoice.outstandingAmount === 0) {
        invoice.paymentStatus = 'Paid';
      } else if (invoice.amountPaid > 0) {
        invoice.paymentStatus = 'Partial';
      }

      // Create payment journal entry
      const paymentEntry = {
        referenceNumber: `${invoice.invoiceNumber}-PMT`,
        referenceType: 'PURCHASE_PAYMENT',
        description: `Payment for Invoice ${invoice.invoiceNumber}`,
        entries: [
          {
            accountName: 'Accounts Payable',
            debit: paymentAmount,
            credit: 0,
          },
          {
            accountName: paymentMethod === 'Bank' ? 'Bank Account' : 'Cash',
            debit: 0,
            credit: paymentAmount,
          },
        ],
        totalDebit: paymentAmount,
        totalCredit: paymentAmount,
        balanced: true,
        createdBy: paidBy,
        createdAt: new Date(),
      };

      await JournalEntry.create(paymentEntry);

      logger.info('Payment recorded for purchase invoice', {
        invoiceNumber: invoice.invoiceNumber,
        paymentAmount,
        remainingBalance: invoice.outstandingAmount,
        paidBy,
      });

      return invoice;
    } catch (error) {
      logger.error('Error recording payment', { error });
      throw error;
    }
  }

  /**
   * Reconcile invoice with PO
   */
  async reconcileWithPO(invoice, purchaseOrder) {
    try {
      if (!invoice) {
        const error = new Error('Invoice not found');
        error.status = 404;
        throw error;
      }

      if (!purchaseOrder) {
        const error = new Error('Purchase order not found');
        error.status = 404;
        throw error;
      }

      // Check PO and Invoice match
      if (Math.abs(invoice.totalAmount - purchaseOrder.totalAmount) > 1) {
        logger.warn('Invoice and PO amounts do not match exactly', {
          invoiceNumber: invoice.invoiceNumber,
          poNumber: purchaseOrder.poNumber,
          difference: invoice.totalAmount - purchaseOrder.totalAmount,
        });
      }

      invoice.reconciliedAt = new Date();
      invoice.reconciliedWith = purchaseOrder.poNumber;

      logger.info('Invoice reconciled with PO', {
        invoiceNumber: invoice.invoiceNumber,
        poNumber: purchaseOrder.poNumber,
      });

      return invoice;
    } catch (error) {
      logger.error('Error reconciling invoice with PO', { error });
      throw error;
    }
  }

  /**
   * Get unpaid invoices for a vendor
   */
  getUnpaidInvoices(invoices, vendorId) {
    try {
      return invoices.filter(inv =>
        inv.vendorId === vendorId &&
        inv.paymentStatus !== 'Paid' &&
        !inv.isDeleted
      );
    } catch (error) {
      logger.error('Error getting unpaid invoices', { vendorId, error });
      throw error;
    }
  }

  /**
   * Get overdue invoices
   */
  getOverdueInvoices(invoices) {
    try {
      const today = new Date();
      return invoices.filter(inv =>
        inv.dueDate &&
        new Date(inv.dueDate) < today &&
        inv.paymentStatus !== 'Paid' &&
        !inv.isDeleted
      );
    } catch (error) {
      logger.error('Error getting overdue invoices', { error });
      throw error;
    }
  }

  /**
   * Get vendor outstanding amount
   */
  getVendorOutstandingAmount(invoices, vendorId) {
    try {
      const vendorInvoices = invoices.filter(inv =>
        inv.vendorId === vendorId &&
        inv.paymentStatus !== 'Paid' &&
        !inv.isDeleted
      );

      const outstanding = vendorInvoices.reduce((sum, inv) => sum + (inv.outstandingAmount || 0), 0);

      return {
        vendorId,
        invoiceCount: vendorInvoices.length,
        totalOutstanding: outstanding,
        invoices: vendorInvoices,
      };
    } catch (error) {
      logger.error('Error getting vendor outstanding amount', { vendorId, error });
      throw error;
    }
  }

  /**
   * Get invoice aging report
   */
  getInvoiceAgingReport(invoices, vendorId = null) {
    try {
      const today = new Date();
      const unpaidInvoices = invoices.filter(inv =>
        inv.paymentStatus !== 'Paid' &&
        !inv.isDeleted &&
        (!vendorId || inv.vendorId === vendorId)
      );

      const aging = {
        current: [],
        days30: [],
        days60: [],
        days90Plus: [],
      };

      unpaidInvoices.forEach(inv => {
        const daysOverdue = Math.floor((today - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24));

        if (daysOverdue <= 0) {
          aging.current.push(inv);
        } else if (daysOverdue <= 30) {
          aging.days30.push(inv);
        } else if (daysOverdue <= 60) {
          aging.days60.push(inv);
        } else {
          aging.days90Plus.push(inv);
        }
      });

      return {
        currentTotal: aging.current.reduce((sum, inv) => sum + (inv.outstandingAmount || 0), 0),
        days30Total: aging.days30.reduce((sum, inv) => sum + (inv.outstandingAmount || 0), 0),
        days60Total: aging.days60.reduce((sum, inv) => sum + (inv.outstandingAmount || 0), 0),
        days90Total: aging.days90Plus.reduce((sum, inv) => sum + (inv.outstandingAmount || 0), 0),
        aging,
      };
    } catch (error) {
      logger.error('Error generating invoice aging report', { error });
      throw error;
    }
  }
}

export default new PurchaseInvoiceService();
