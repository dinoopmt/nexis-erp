/**
 * Sales Invoice Service
 * Handles all business logic for sales invoice creation, updates, and management
 * Includes double-entry ledger creation for credit sales
 */

import SalesInvoice from '../../../Models/Sales/SalesInvoice.js';
import Counter from '../../../Models/SequenceModel.js';
import Customer from '../../../Models/Customer.js';
import ChartOfAccounts from '../../../Models/ChartOfAccounts.js';
import AccountGroup from '../../../Models/AccountGroup.js';
import JournalEntry from '../../../Models/JournalEntry.js';
import CreditSaleReceipt from '../../../Models/Sales/CreditSaleReceipt.js';
import CustomerReceipt from '../../../Models/CustomerReceipt.js';
import logger from '../../../config/logger.js';
import AppError from '../../../config/errorHandler.js';

class SalesInvoiceService {
  /**
   * Generate next invoice number based on financial year
   * @param {string} financialYear - Financial year (e.g., "2024-2025")
   * @returns {Promise<string>} - Generated invoice number (e.g., "SI/2024-2025/0001")
   */
  async getNextInvoiceNumber(financialYear) {
    try {
      if (!financialYear) {
        const error = new Error('Financial year is required');
        error.status = 400;
        throw error;
      }

      const counter = await Counter.findOneAndUpdate(
        { module: 'sales_invoice', financialYear },
        { $inc: { lastNumber: 1 }, $setOnInsert: { prefix: 'SI' } },
        { returnDocument: 'after', upsert: true }
      );

      const paddedNumber = String(counter.lastNumber).padStart(4, '0');
      const invoiceNumber = `SI/${financialYear}/${paddedNumber}`;

      logger.info('Generated invoice number', { invoiceNumber, financialYear });
      return invoiceNumber;
    } catch (err) {
      logger.error('Failed to generate invoice number', { error: err.message, financialYear });
      throw err;
    }
  }

  /**
   * Get or create Sales Revenue account
   * @returns {Promise<Object>} - Chart of Accounts record
   */
  async getOrCreateSalesRevenueAccount() {
    try {
      let salesAccount = await ChartOfAccounts.findOne({
        accountName: 'Sales Revenue',
        isDeleted: false,
      });

      if (salesAccount) {
        return salesAccount;
      }

      // Create account group if not exists
      let salesGroup = await AccountGroup.findOne({
        code: 'SR',
        isActive: true,
      });

      if (!salesGroup) {
        salesGroup = new AccountGroup({
          name: 'SALES REVENUE',
          code: 'SR',
          description: 'Sales Revenue Accounts',
          level: 1,
          type: 'INCOME',
          accountCategory: 'PROFIT_LOSS',
          nature: 'CREDIT',
          allowPosting: true,
          isActive: true,
        });
        await salesGroup.save();
        logger.info('Created new account group', { groupCode: 'SR' });
      }

      // Create sales revenue account
      salesAccount = new ChartOfAccounts({
        accountNumber: 'SALES-001',
        accountName: 'Sales Revenue',
        accountGroup: salesGroup._id,
        accountType: 'NOMINAL',
        nature: 'CREDIT',
        openingBalance: 0,
        accountCurrency: 'INR',
        costCenter: [],
        allowPosting: true,
        useForPandL: true,
        isDeleted: false,
      });

      await salesAccount.save();
      logger.info('Created new Sales Revenue account', { accountId: salesAccount._id });
      return salesAccount;
    } catch (err) {
      logger.error('Failed to get/create Sales Revenue account', { error: err.message });
      throw err;
    }
  }

  /**
   * Create double-entry ledger for credit sales
   * @param {Object} invoice - Sales invoice object
   * @param {Object} customer - Customer document
   * @returns {Promise<Object>} - Created journal entry
   */
  async createCreditSaleLedgerEntry(invoice, customer) {
    try {
      if (!customer.ledgerAccountId) {
        const error = new Error('Customer does not have a ledger account');
        error.status = 400;
        throw error;
      }

      logger.info('Creating double-entry ledger for credit sale', { invoiceNumber: invoice.invoiceNumber });

      const salesAccount = await this.getOrCreateSalesRevenueAccount();

      // Create journal entry with two legs
      const journalEntry = new JournalEntry({
        transactionType: 'Sales Invoice',
        transactionId: invoice._id,
        date: invoice.date,
        description: `Credit sale invoice ${invoice.invoiceNumber}`,
        journalEntryNumber: invoice.invoiceNumber,
        reference: invoice.invoiceNumber,
        items: [
          {
            accountId: customer.ledgerAccountId, // Debit customer account
            debit: invoice.totalAmount || 0,
            credit: 0,
            description: `Customer ${customer.name} - Invoice ${invoice.invoiceNumber}`,
          },
          {
            accountId: salesAccount._id, // Credit sales revenue
            debit: 0,
            credit: invoice.totalAmount || 0,
            description: `Sales revenue from ${customer.name}`,
          },
        ],
        totalDebit: invoice.totalAmount || 0,
        totalCredit: invoice.totalAmount || 0,
        isBalanced: true,
        status: 'Drafted',
        notes: `Auto-generated ledger for invoice ${invoice.invoiceNumber}`,
      });

      await journalEntry.save();
      logger.info('Created double-entry ledger', { journalEntryId: journalEntry._id, invoiceNumber: invoice.invoiceNumber });
      return journalEntry;
    } catch (err) {
      logger.error('Failed to create credit sale ledger entry', { error: err.message });
      throw err;
    }
  }

  /**
   * Create a new sales invoice
   * @param {Object} invoiceData - Invoice details
   * @returns {Promise<Object>} - Created invoice with journal entry (if credit)
   */
  async createSalesInvoice(invoiceData) {
    try {
      const { invoiceNumber, customerName, customerId, date, items, financialYear, paymentType, paymentTerms } = invoiceData;

      // Validate required fields
      if (!invoiceNumber || !customerName || !date || !financialYear) {
        const error = new Error('Missing required fields: invoiceNumber, customerName, date, financialYear');
        error.status = 400;
        throw error;
      }

      if (!items || items.length === 0) {
        const error = new Error('Invoice must contain at least one item');
        error.status = 400;
        throw error;
      }

      // Check for duplicate invoice number
      const existingInvoice = await SalesInvoice.findOne({ invoiceNumber });
      if (existingInvoice) {
        const error = new Error('Invoice number already exists');
        error.status = 409;
        throw error;
      }

      // Create invoice
      const invoice = new SalesInvoice(invoiceData);
      await invoice.save();
      logger.info('Sales invoice created', { invoiceId: invoice._id, invoiceNumber });

      // Create double-entry ledger for credit sales
      let journalEntry = null;
      if (paymentType === 'Credit' && paymentTerms === 'Credit' && customerId) {
        try {
          const customer = await Customer.findById(customerId);
          if (customer) {
            journalEntry = await this.createCreditSaleLedgerEntry(invoice, customer);
          }
        } catch (ledgerErr) {
          logger.warn('Failed to create ledger entry for credit sale', {
            invoiceId: invoice._id,
            error: ledgerErr.message,
          });
          // Don't fail invoice creation if ledger creation fails
        }
      }

      return {
        invoice,
        journalEntry,
        success: true,
      };
    } catch (err) {
      logger.error('Failed to create sales invoice', { error: err.message });
      throw err;
    }
  }

  /**
   * Get invoice by ID
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<Object>} - Invoice document
   */
  async getInvoiceById(invoiceId) {
    try {
      const invoice = await SalesInvoice.findById(invoiceId)
        .populate('customerId')
        .populate('items.productId');

      if (!invoice) {
        const error = new Error('Invoice not found');
        error.status = 404;
        throw error;
      }

      logger.info('Retrieved invoice', { invoiceId });
      return invoice;
    } catch (err) {
      logger.error('Failed to get invoice', { error: err.message, invoiceId });
      throw err;
    }
  }

  /**
   * Get all invoices with pagination and filters
   * @param {Object} filters - Query filters { customerId, status, startDate, endDate, page, limit }
   * @returns {Promise<Object>} - Paginated invoices with count
   */
  async getAllInvoices(filters = {}) {
    try {
      const { customerId, status, startDate, endDate, page = 1, limit = 20 } = filters;
      const skip = (page - 1) * limit;

      let query = { isDeleted: false };

      if (customerId) query.customerId = customerId;
      if (status) query.status = status;
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
      }

      const invoices = await SalesInvoice.find(query)
        .populate('customerId')
        .populate('items.productId')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit);

      const total = await SalesInvoice.countDocuments(query);

      logger.info('Retrieved invoices list', { count: invoices.length, total, page, limit });
      return {
        invoices,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (err) {
      logger.error('Failed to get invoices', { error: err.message });
      throw err;
    }
  }

  /**
   * Update an invoice
   * @param {string} invoiceId - Invoice ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object>} - Updated invoice
   */
  async updateInvoice(invoiceId, updateData) {
    try {
      const invoice = await SalesInvoice.findByIdAndUpdate(invoiceId, updateData, {
        returnDocument: 'after',
        runValidators: true,
      });

      if (!invoice) {
        const error = new Error('Invoice not found');
        error.status = 404;
        throw error;
      }

      logger.info('Invoice updated', { invoiceId, updatedFields: Object.keys(updateData) });
      return invoice;
    } catch (err) {
      logger.error('Failed to update invoice', { error: err.message, invoiceId });
      throw err;
    }
  }

  /**
   * Delete an invoice (soft delete)
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<void>}
   */
  async deleteInvoice(invoiceId) {
    try {
      const invoice = await SalesInvoice.findByIdAndUpdate(invoiceId, { isDeleted: true }, { returnDocument: 'after' });

      if (!invoice) {
        const error = new Error('Invoice not found');
        error.status = 404;
        throw error;
      }

      logger.info('Invoice deleted (soft)', { invoiceId });
    } catch (err) {
      logger.error('Failed to delete invoice', { error: err.message, invoiceId });
      throw err;
    }
  }

  /**
   * Get invoice summary/dashboard data
   * @param {Object} filters - Filters { year, month, customerName }
   * @returns {Promise<Object>} - Summary stats
   */
  async getInvoiceSummary(filters = {}) {
    try {
      const { year, month, customerId } = filters;
      let matchStage = { isDeleted: false };

      if (year || month) {
        matchStage.date = {};
        if (year) {
          const startOfYear = new Date(`${year}-01-01`);
          const endOfYear = new Date(`${year}-12-31`);
          matchStage.date.$gte = startOfYear;
          matchStage.date.$lte = endOfYear;
        }
        if (month) {
          const startOfMonth = new Date(`${year}-${String(month).padStart(2, '0')}-01`);
          const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0);
          matchStage.date.$gte = startOfMonth;
          matchStage.date.$lte = endOfMonth;
        }
      }

      if (customerId) matchStage.customerId = customerId;

      const summary = await SalesInvoice.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$totalAmount' },
            count: { $sum: 1 },
            avgAmount: { $avg: '$totalAmount' },
          },
        },
      ]);

      logger.info('Generated invoice summary', { filters });
      return summary[0] || { totalAmount: 0, count: 0, avgAmount: 0 };
    } catch (err) {
      logger.error('Failed to get invoice summary', { error: err.message });
      throw err;
    }
  }
}

export default new SalesInvoiceService();
