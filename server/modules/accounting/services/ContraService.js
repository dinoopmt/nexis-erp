/**
 * Contra Service
 * Handles internal transfers and contra entries between accounts
 * Creates automatic double-entry journal entries for transfers
 */

import Contra from '../../Models/Contra.js';
import ChartOfAccounts from '../../Models/ChartOfAccounts.js';
import AccountGroup from '../../Models/AccountGroup.js';
import JournalEntry from '../../Models/JournalEntry.js';
import JournalEntryService from './JournalEntryService.js';
import ChartOfAccountsService from './ChartOfAccountsService.js';
import logger from '../../../config/logger.js';

class ContraService {
  /**
   * Validate contra accounts
   * @param {string} fromAccountId - Source account
   * @param {string} toAccountId - Destination account
   * @returns {Promise<Object>} - { fromAccount, toAccount }
   */
  async validateContraAccounts(fromAccountId, toAccountId) {
    try {
      if (fromAccountId === toAccountId) {
        const error = new Error('From and To accounts cannot be the same');
        error.status = 400;
        throw error;
      }

      // Verify both accounts exist
      const fromAccount = await ChartOfAccounts.findById(fromAccountId).populate('accountGroupId');
      const toAccount = await ChartOfAccounts.findById(toAccountId).populate('accountGroupId');

      if (!fromAccount || fromAccount.isDeleted) {
        const error = new Error('Invalid or deleted From account');
        error.status = 404;
        throw error;
      }

      if (!toAccount || toAccount.isDeleted) {
        const error = new Error('Invalid or deleted To account');
        error.status = 404;
        throw error;
      }

      // Validate accounts are cash/bank or inter-account transfer eligible
      const validAccountTypes = ['ASSET', 'BANK'];
      const fromType = fromAccount.accountGroupId?.type;
      const toType = toAccount.accountGroupId?.type;

      // Allow transfers between most account types
      logger.info('Contra accounts validated', { fromAccountId, toAccountId });

      return { fromAccount, toAccount };
    } catch (err) {
      logger.error('Contra account validation failed', { error: err.message });
      throw err;
    }
  }

  /**
   * Validate transfer amount
   * @param {string} fromAccountId - Source account
   * @param {number} amount - Transfer amount
   * @returns {Promise<boolean>} - true if valid
   */
  async validateTransferAmount(fromAccountId, amount) {
    try {
      if (!amount || amount <= 0) {
        const error = new Error('Amount must be greater than 0');
        error.status = 400;
        throw error;
      }

      // Optional: Check if account has sufficient balance
      const account = await ChartOfAccounts.findById(fromAccountId);
      if (account && account.currentBalance < amount) {
        logger.warn('Insufficient balance for transfer', { fromAccountId, available: account.currentBalance, requested: amount });
        // Continue anyway - some systems allow overdrafts
      }

      return true;
    } catch (err) {
      logger.error('Transfer amount validation failed', { error: err.message });
      throw err;
    }
  }

  /**
   * Create a novo contra entry
   * @param {Object} contraData - Contra details
   * @returns {Promise<Object>} - Created contra with journal entry
   */
  async createContra(contraData) {
    try {
      const { fromAccountId, toAccountId, amount, transferType, referenceNumber, description, chequeNumber, chequeDate, createdBy } = contraData;

      // Validate required fields
      if (!fromAccountId || !toAccountId || !amount || !transferType) {
        const error = new Error('From Account, To Account, Amount, and Transfer Type are required');
        error.status = 400;
        throw error;
      }

      // Validate accounts
      const { fromAccount, toAccount } = await this.validateContraAccounts(fromAccountId, toAccountId);

      // Validate amount
      await this.validateTransferAmount(fromAccountId, amount);

      // Store amount as decimal
      const amountValue = parseFloat(amount);

      // Create contra entry
      const contra = new Contra({
        contraDate: contraData.contraDate || new Date(),
        fromAccountId,
        toAccountId,
        amount: amountValue,
        transferType,
        referenceNumber,
        description: description || `Transfer from ${fromAccount.accountName} to ${toAccount.accountName}`,
        chequeNumber,
        chequeDate,
        createdBy,
        status: 'Pending',
      });

      await contra.save();

      logger.info('Contra entry created', { contraId: contra._id, amount });

      // Return with populated accounts
      await contra.populate('fromAccountId', 'accountNumber accountName');
      await contra.populate('toAccountId', 'accountNumber accountName');

      return contra;
    } catch (err) {
      logger.error('Failed to create contra entry', { error: err.message });
      throw err;
    }
  }

  /**
   * Get contra by ID
   * @param {string} contraId - Contra ID
   * @returns {Promise<Object>} - Contra with populated accounts
   */
  async getContraById(contraId) {
    try {
      const contra = await Contra.findById(contraId)
        .populate('fromAccountId', 'accountNumber accountName accountGroupId')
        .populate('toAccountId', 'accountNumber accountName accountGroupId');

      if (!contra) {
        const error = new Error('Contra entry not found');
        error.status = 404;
        throw error;
      }

      logger.info('Retrieved contra entry', { contraId });
      return contra;
    } catch (err) {
      logger.error('Failed to get contra entry', { error: err.message, contraId });
      throw err;
    }
  }

  /**
   * Get all contra entries with filters
   * @param {Object} filters - { fromAccountId, toAccountId, status, startDate, endDate, page, limit }
   * @returns {Promise<Object>} - Paginated contra entries
   */
  async getAllContra(filters = {}) {
    try {
      const { fromAccountId, toAccountId, status, startDate, endDate, page = 1, limit = 20 } = filters;
      const skip = (page - 1) * limit;

      let query = { isDeleted: false };

      if (fromAccountId) query.fromAccountId = fromAccountId;
      if (toAccountId) query.toAccountId = toAccountId;
      if (status) query.status = status;
      if (startDate || endDate) {
        query.contraDate = {};
        if (startDate) query.contraDate.$gte = new Date(startDate);
        if (endDate) query.contraDate.$lte = new Date(endDate);
      }

      const contra = await Contra.find(query)
        .populate('fromAccountId', 'accountNumber accountName')
        .populate('toAccountId', 'accountNumber accountName')
        .sort({ contraDate: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Contra.countDocuments(query);

      logger.info('Retrieved contra entries', { count: contra.length, total });
      return {
        contra,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (err) {
      logger.error('Failed to get contra entries', { error: err.message });
      throw err;
    }
  }

  /**
   * Update a contra (only if Pending)
   * @param {string} contraId - Contra ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object>} - Updated contra
   */
  async updateContra(contraId, updateData) {
    try {
      const contra = await Contra.findById(contraId);

      if (!contra) {
        const error = new Error('Contra entry not found');
        error.status = 404;
        throw error;
      }

      // Only allow updates if Pending
      if (contra.status !== 'Pending') {
        const error = new Error('Can only update pending contra entries');
        error.status = 409;
        throw error;
      }

      // Validate if updating accounts
      if (updateData.fromAccountId || updateData.toAccountId) {
        const fromId = updateData.fromAccountId || contra.fromAccountId;
        const toId = updateData.toAccountId || contra.toAccountId;
        await this.validateContraAccounts(fromId, toId);
      }

      // Validate if updating amount
      if (updateData.amount) {
        await this.validateTransferAmount(contra.fromAccountId, updateData.amount);
        updateData.amount = parseFloat(updateData.amount);
      }

      const updated = await Contra.findByIdAndUpdate(contraId, updateData, { returnDocument: 'after' })
        .populate('fromAccountId', 'accountNumber accountName')
        .populate('toAccountId', 'accountNumber accountName');

      logger.info('Contra entry updated', { contraId, updatedFields: Object.keys(updateData) });
      return updated;
    } catch (err) {
      logger.error('Failed to update contra entry', { error: err.message, contraId });
      throw err;
    }
  }

  /**
   * Approve and process contra (creates journal entry)
   * @param {string} contraId - Contra ID
   * @param {string} approvedBy - User approving
   * @returns {Promise<Object>} - Processed contra with journal entry
   */
  async approveContra(contraId, approvedBy) {
    try {
      const contra = await Contra.findById(contraId)
        .populate('fromAccountId')
        .populate('toAccountId');

      if (!contra) {
        const error = new Error('Contra entry not found');
        error.status = 404;
        throw error;
      }

      if (contra.status !== 'Pending') {
        const error = new Error('Only pending contra entries can be approved');
        error.status = 409;
        throw error;
      }

      // Create automatic journal entry for the transfer
      try {
        const journalData = {
          voucherType: 'CV', // Custom type for Contra Voucher
          entryDate: contra.contraDate,
          description: contra.description || `Contra transfer from ${contra.fromAccountId.accountName} to ${contra.toAccountId.accountName}`,
          referenceNumber: contra.referenceNumber,
          lineItems: [
            {
              accountId: contra.toAccountId._id,
              debitAmount: contra.amount,
              creditAmount: 0,
            },
            {
              accountId: contra.fromAccountId._id,
              debitAmount: 0,
              creditAmount: contra.amount,
            },
          ],
          notes: `Auto-generated from contra: ${contra._id}`,
        };

        // Create and post journal entry
        const journalEntry = await JournalEntryService.createJournalEntry(journalData);
        await JournalEntryService.postJournalEntry(journalEntry._id, approvedBy);

        // Update contra with journal entry reference
        contra.status = 'Approved';
        contra.approvedBy = approvedBy;
        contra.approvalDate = new Date();
        contra.journalEntryId = journalEntry._id;
        await contra.save();

        logger.info('Contra entry approved with journal entry', { contraId, journalEntryId: journalEntry._id });

        return {
          contra,
          journalEntry,
        };
      } catch (journalErr) {
        logger.warn('Failed to create journal entry for contra', { contraId, error: journalErr.message });
        throw journalErr;
      }
    } catch (err) {
      logger.error('Failed to approve contra entry', { error: err.message, contraId });
      throw err;
    }
  }

  /**
   * Reject contra
   * @param {string} contraId - Contra ID
   * @param {string} rejectionReason - Reason for rejection
   * @returns {Promise<Object>} - Updated contra
   */
  async rejectContra(contraId, rejectionReason) {
    try {
      if (!rejectionReason || rejectionReason.length < 5) {
        const error = new Error('Rejection reason must be at least 5 characters');
        error.status = 400;
        throw error;
      }

      const contra = await Contra.findById(contraId);

      if (!contra) {
        const error = new Error('Contra entry not found');
        error.status = 404;
        throw error;
      }

      if (contra.status !== 'Pending') {
        const error = new Error('Only pending contra entries can be rejected');
        error.status = 409;
        throw error;
      }

      const updated = await Contra.findByIdAndUpdate(
        contraId,
        {
          status: 'Rejected',
          rejectionReason,
          rejectionDate: new Date(),
        },
        { returnDocument: 'after' }
      );

      logger.info('Contra entry rejected', { contraId, reason: rejectionReason });
      return updated;
    } catch (err) {
      logger.error('Failed to reject contra entry', { error: err.message, contraId });
      throw err;
    }
  }

  /**
   * Delete contra (soft delete, only if not approved)
   * @param {string} contraId - Contra ID
   * @returns {Promise<void>}
   */
  async deleteContra(contraId) {
    try {
      const contra = await Contra.findById(contraId);

      if (!contra) {
        const error = new Error('Contra entry not found');
        error.status = 404;
        throw error;
      }

      if (contra.status === 'Approved') {
        const error = new Error('Cannot delete approved contra entries');
        error.status = 409;
        throw error;
      }

      contra.isDeleted = true;
      await contra.save();

      logger.info('Contra entry deleted (soft)', { contraId });
    } catch (err) {
      logger.error('Failed to delete contra entry', { error: err.message, contraId });
      throw err;
    }
  }

  /**
   * Get contra by account
   * @param {string} accountId - Account ID (as from or to)
   * @param {Object} filters - { page, limit }
   * @returns {Promise<Object>} - Paginated contra entries for account
   */
  async getContraByAccount(accountId, filters = {}) {
    try {
      const { page = 1, limit = 20 } = filters;
      const skip = (page - 1) * limit;

      const query = {
        $or: [{ fromAccountId: accountId }, { toAccountId: accountId }],
        isDeleted: false,
      };

      const contra = await Contra.find(query)
        .populate('fromAccountId', 'accountNumber accountName')
        .populate('toAccountId', 'accountNumber accountName')
        .sort({ contraDate: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Contra.countDocuments(query);

      logger.info('Retrieved account contra entries', { accountId, count: contra.length });
      return {
        contra,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (err) {
      logger.error('Failed to get account contra entries', { error: err.message, accountId });
      throw err;
    }
  }

  /**
   * Get transfer summary
   * @param {Object} filters - { startDate, endDate, transferType }
   * @returns {Promise<Object>} - Summary stats
   */
  async getContraSummary(filters = {}) {
    try {
      const { startDate, endDate, transferType } = filters;
      let matchStage = { isDeleted: false };

      if (transferType) matchStage.transferType = transferType;
      if (startDate || endDate) {
        matchStage.contraDate = {};
        if (startDate) matchStage.contraDate.$gte = new Date(startDate);
        if (endDate) matchStage.contraDate.$lte = new Date(endDate);
      }

      const summary = await Contra.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
          },
        },
      ]);

      logger.info('Generated contra summary', { filters });
      return summary;
    } catch (err) {
      logger.error('Failed to get contra summary', { error: err.message });
      throw err;
    }
  }
}

export default new ContraService();
