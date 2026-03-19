/**
 * Journal Entry Service
 * Handles double-entry bookkeeping with debit/credit validation and account balance updates
 */

import JournalEntry from '../../Models/JournalEntry.js';
import ChartOfAccounts from '../../Models/ChartOfAccounts.js';
import ChartOfAccountsService from './ChartOfAccountsService.js';
import logger from '../../../config/logger.js';

class JournalEntryService {
  /**
   * Generate unique voucher number
   * @param {string} voucherType - JV, PV, RV, BV
   * @returns {Promise<string>} - Voucher number (e.g., "JV-00001")
   */
  async generateVoucherNumber(voucherType) {
    try {
      const validTypes = ['JV', 'PV', 'RV', 'BV'];
      if (!validTypes.includes(voucherType)) {
        const error = new Error(`Invalid voucher type. Valid types: ${validTypes.join(', ')}`);
        error.status = 400;
        throw error;
      }

      const lastEntry = await JournalEntry.findOne({ voucherType, isDeleted: false })
        .sort({ createdDate: -1 })
        .lean();

      let nextNumber = 1;
      if (lastEntry && lastEntry.voucherNumber) {
        const numericPart = parseInt(lastEntry.voucherNumber.replace(/\D/g, ''));
        if (!isNaN(numericPart)) {
          nextNumber = numericPart + 1;
        }
      }

      const voucherNumber = `${voucherType}-${String(nextNumber).padStart(5, '0')}`;
      logger.info('Generated voucher number', { voucherNumber, voucherType });
      return voucherNumber;
    } catch (err) {
      logger.error('Failed to generate voucher number', { error: err.message, voucherType });
      throw err;
    }
  }

  /**
   * Validate line items for journal entry
   * @param {Array} lineItems - Array of { accountId, debitAmount, creditAmount }
   * @returns {Promise<Object>} - { isValid, totalDebit, totalCredit, errors }
   */
  async validateLineItems(lineItems) {
    try {
      if (!lineItems || lineItems.length === 0) {
        const error = new Error('Journal entry must have at least one line item');
        error.status = 400;
        throw error;
      }

      let totalDebit = 0;
      let totalCredit = 0;
      const errors = [];

      for (let i = 0; i < lineItems.length; i++) {
        const item = lineItems[i];

        // Validate required fields
        if (!item.accountId) {
          errors.push(`Line ${i + 1}: Account ID is required`);
          continue;
        }

        // Validate amounts
        const debit = parseFloat(item.debitAmount || 0);
        const credit = parseFloat(item.creditAmount || 0);

        if (debit < 0 || credit < 0) {
          errors.push(`Line ${i + 1}: Amounts cannot be negative`);
          continue;
        }

        if (debit === 0 && credit === 0) {
          errors.push(`Line ${i + 1}: Either debit or credit amount is required`);
          continue;
        }

        if (debit > 0 && credit > 0) {
          errors.push(`Line ${i + 1}: Cannot have both debit and credit amounts`);
          continue;
        }

        // Verify account exists and is not deleted
        const account = await ChartOfAccounts.findById(item.accountId);
        if (!account || account.isDeleted) {
          errors.push(`Line ${i + 1}: Invalid or deleted account`);
          continue;
        }

        totalDebit += debit;
        totalCredit += credit;
      }

      if (errors.length > 0) {
        const error = new Error('Line item validation failed');
        error.status = 400;
        error.details = errors;
        throw error;
      }

      // Check if debits equal credits (fundamental rule of double-entry)
      if (totalDebit !== totalCredit) {
        const error = new Error(`Debits (${totalDebit}) do not equal Credits (${totalCredit})`);
        error.status = 400;
        throw error;
      }

      logger.info('Line items validated', { count: lineItems.length, totalDebit, totalCredit });
      return {
        isValid: true,
        totalDebit,
        totalCredit,
        lineItems,
      };
    } catch (err) {
      logger.error('Line item validation failed', { error: err.message });
      throw err;
    }
  }

  /**
   * Create a new journal entry
   * @param {Object} entryData - Entry details
   * @returns {Promise<Object>} - Created entry with populated accounts
   */
  async createJournalEntry(entryData) {
    try {
      const { voucherType, entryDate, description, referenceNumber, lineItems, notes } = entryData;

      // Validate required fields
      if (!voucherType || !entryDate || !description) {
        const error = new Error('Voucher Type, Entry Date, and Description are required');
        error.status = 400;
        throw error;
      }

      // Validate and normalize line items
      const validatedItems = await this.validateLineItems(lineItems);

      // Generate voucher number
      const voucherNumber = await this.generateVoucherNumber(voucherType);

      // Create entry
      const journalEntry = new JournalEntry({
        voucherType,
        voucherNumber,
        entryDate,
        description,
        referenceNumber,
        lineItems: validatedItems.lineItems,
        totalDebit: validatedItems.totalDebit,
        totalCredit: validatedItems.totalCredit,
        status: 'Drafted',
        notes,
      });

      await journalEntry.save();
      await journalEntry.populate('lineItems.accountId', 'accountNumber accountName');

      logger.info('Journal entry created', { entryId: journalEntry._id, voucherNumber });
      return journalEntry;
    } catch (err) {
      logger.error('Failed to create journal entry', { error: err.message });
      throw err;
    }
  }

  /**
   * Get entry by ID
   * @param {string} entryId - Entry ID
   * @returns {Promise<Object>} - Entry with populated accounts
   */
  async getEntryById(entryId) {
    try {
      const entry = await JournalEntry.findById(entryId)
        .populate('lineItems.accountId', 'accountNumber accountName accountGroupId');

      if (!entry) {
        const error = new Error('Journal entry not found');
        error.status = 404;
        throw error;
      }

      logger.info('Retrieved journal entry', { entryId });
      return entry;
    } catch (err) {
      logger.error('Failed to get journal entry', { error: err.message, entryId });
      throw err;
    }
  }

  /**
   * Get all entries with pagination and filters
   * @param {Object} filters - { voucherType, status, startDate, endDate, page, limit }
   * @returns {Promise<Object>} - Paginated entries
   */
  async getAllEntries(filters = {}) {
    try {
      const { voucherType, status, startDate, endDate, page = 1, limit = 20 } = filters;
      const skip = (page - 1) * limit;

      let query = { isDeleted: false };

      if (voucherType) query.voucherType = voucherType;
      if (status) query.status = status;
      if (startDate || endDate) {
        query.entryDate = {};
        if (startDate) query.entryDate.$gte = new Date(startDate);
        if (endDate) query.entryDate.$lte = new Date(endDate);
      }

      const entries = await JournalEntry.find(query)
        .populate('lineItems.accountId', 'accountNumber accountName')
        .sort({ entryDate: -1 })
        .skip(skip)
        .limit(limit);

      const total = await JournalEntry.countDocuments(query);

      logger.info('Retrieved journal entries', { count: entries.length, total });
      return {
        entries,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (err) {
      logger.error('Failed to get journal entries', { error: err.message });
      throw err;
    }
  }

  /**
   * Update a journal entry (only if in Drafted status)
   * @param {string} entryId - Entry ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object>} - Updated entry
   */
  async updateJournalEntry(entryId, updateData) {
    try {
      const entry = await JournalEntry.findById(entryId);

      if (!entry) {
        const error = new Error('Journal entry not found');
        error.status = 404;
        throw error;
      }

      // Only allow updates if in Drafted status
      if (entry.status !== 'Drafted') {
        const error = new Error('Can only update entries in Drafted status');
        error.status = 409;
        throw error;
      }

      // If updating line items, re-validate
      if (updateData.lineItems) {
        const validatedItems = await this.validateLineItems(updateData.lineItems);
        updateData.lineItems = validatedItems.lineItems;
        updateData.totalDebit = validatedItems.totalDebit;
        updateData.totalCredit = validatedItems.totalCredit;
      }

      const updated = await JournalEntry.findByIdAndUpdate(entryId, updateData, { new: true })
        .populate('lineItems.accountId', 'accountNumber accountName');

      logger.info('Journal entry updated', { entryId, updatedFields: Object.keys(updateData) });
      return updated;
    } catch (err) {
      logger.error('Failed to update journal entry', { error: err.message, entryId });
      throw err;
    }
  }

  /**
   * Post journal entry (apply to accounts)
   * @param {string} entryId - Entry ID
   * @param {string} postedBy - User posting the entry
   * @returns {Promise<Object>} - Posted entry
   */
  async postJournalEntry(entryId, postedBy) {
    try {
      const entry = await JournalEntry.findById(entryId).populate('lineItems.accountId');

      if (!entry) {
        const error = new Error('Journal entry not found');
        error.status = 404;
        throw error;
      }

      if (entry.status !== 'Drafted') {
        const error = new Error('Only drafted entries can be posted');
        error.status = 409;
        throw error;
      }

      // Update account balances
      for (const item of entry.lineItems) {
        const debit = parseFloat(item.debitAmount || 0);
        const credit = parseFloat(item.creditAmount || 0);
        await ChartOfAccountsService.updateBalance(item.accountId, debit, credit);
      }

      // Mark entry as posted
      entry.status = 'Posted';
      entry.postedBy = postedBy;
      entry.postedDate = new Date();
      await entry.save();

      logger.info('Journal entry posted', { entryId, voucherNumber: entry.voucherNumber, postedBy });
      return entry;
    } catch (err) {
      logger.error('Failed to post journal entry', { error: err.message, entryId });
      throw err;
    }
  }

  /**
   * Approve journal entry
   * @param {string} entryId - Entry ID
   * @param {string} approvedBy - User approving
   * @param {string} notes - Approval notes
   * @returns {Promise<Object>} - Updated entry
   */
  async approveJournalEntry(entryId, approvedBy, notes = '') {
    try {
      const entry = await JournalEntry.findById(entryId);

      if (!entry) {
        const error = new Error('Journal entry not found');
        error.status = 404;
        throw error;
      }

      const updated = await JournalEntry.findByIdAndUpdate(
        entryId,
        {
          status: 'Approved',
          approvedBy,
          approvalNotes: notes,
          approvalDate: new Date(),
        },
        { new: true }
      );

      logger.info('Journal entry approved', { entryId, approvedBy });
      return updated;
    } catch (err) {
      logger.error('Failed to approve journal entry', { error: err.message, entryId });
      throw err;
    }
  }

  /**
   * Reject journal entry
   * @param {string} entryId - Entry ID
   * @param {string} rejectionReason - Reason for rejection
   * @returns {Promise<Object>} - Updated entry
   */
  async rejectJournalEntry(entryId, rejectionReason) {
    try {
      if (!rejectionReason || rejectionReason.length < 5) {
        const error = new Error('Rejection reason must be at least 5 characters');
        error.status = 400;
        throw error;
      }

      const updated = await JournalEntry.findByIdAndUpdate(
        entryId,
        {
          status: 'Rejected',
          rejectionReason,
          rejectionDate: new Date(),
        },
        { new: true }
      );

      if (!updated) {
        const error = new Error('Journal entry not found');
        error.status = 404;
        throw error;
      }

      logger.info('Journal entry rejected', { entryId, reason: rejectionReason });
      return updated;
    } catch (err) {
      logger.error('Failed to reject journal entry', { error: err.message, entryId });
      throw err;
    }
  }

  /**
   * Delete entry (soft delete)
   * @param {string} entryId - Entry ID
   * @returns {Promise<void>}
   */
  async deleteJournalEntry(entryId) {
    try {
      const entry = await JournalEntry.findById(entryId);

      if (!entry) {
        const error = new Error('Journal entry not found');
        error.status = 404;
        throw error;
      }

      // Cannot delete posted entries
      if (entry.status === 'Posted') {
        const error = new Error('Cannot delete posted entries');
        error.status = 409;
        throw error;
      }

      entry.isDeleted = true;
      await entry.save();

      logger.info('Journal entry deleted (soft)', { entryId });
    } catch (err) {
      logger.error('Failed to delete journal entry', { error: err.message, entryId });
      throw err;
    }
  }

  /**
   * Get entries by account
   * @param {string} accountId - Account ID
   * @param {Object} filters - { voucherType, startDate, endDate, page, limit }
   * @returns {Promise<Object>} - Paginated entries for account
   */
  async getEntryByAccount(accountId, filters = {}) {
    try {
      const { voucherType, startDate, endDate, page = 1, limit = 20 } = filters;
      const skip = (page - 1) * limit;

      let query = {
        'lineItems.accountId': accountId,
        isDeleted: false,
      };

      if (voucherType) query.voucherType = voucherType;
      if (startDate || endDate) {
        query.entryDate = {};
        if (startDate) query.entryDate.$gte = new Date(startDate);
        if (endDate) query.entryDate.$lte = new Date(endDate);
      }

      const entries = await JournalEntry.find(query)
        .populate('lineItems.accountId', 'accountNumber accountName')
        .sort({ entryDate: -1 })
        .skip(skip)
        .limit(limit);

      const total = await JournalEntry.countDocuments(query);

      logger.info('Retrieved account entries', { accountId, count: entries.length });
      return {
        entries,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (err) {
      logger.error('Failed to get account entries', { error: err.message, accountId });
      throw err;
    }
  }

  /**
   * Get summary statistics
   * @param {Object} filters - { startDate, endDate, voucherType }
   * @returns {Promise<Object>} - Summary stats
   */
  async getEntrySummary(filters = {}) {
    try {
      const { startDate, endDate, voucherType } = filters;
      let matchStage = { isDeleted: false };

      if (voucherType) matchStage.voucherType = voucherType;
      if (startDate || endDate) {
        matchStage.entryDate = {};
        if (startDate) matchStage.entryDate.$gte = new Date(startDate);
        if (endDate) matchStage.entryDate.$lte = new Date(endDate);
      }

      const summary = await JournalEntry.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalDebit: { $sum: '$totalDebit' },
            totalCredit: { $sum: '$totalCredit' },
          },
        },
      ]);

      logger.info('Generated entry summary', { filters });
      return summary;
    } catch (err) {
      logger.error('Failed to get entry summary', { error: err.message });
      throw err;
    }
  }
}

export default new JournalEntryService();
