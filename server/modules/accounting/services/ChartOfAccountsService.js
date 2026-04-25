/**
 * Chart of Accounts Service
 * Manages all company accounts, balances, and account properties
 */

import ChartOfAccounts from '../../Models/ChartOfAccounts.js';
import AccountGroup from '../../Models/AccountGroup.js';
import logger from '../../../config/logger.js';

class ChartOfAccountsService {
  /**
   * Validate account group exists and is not deleted
   * @param {string} accountGroupId - Account group ID
   * @returns {Promise<Object>} - Account group document
   */
  async validateAccountGroup(accountGroupId) {
    try {
      const accountGroup = await AccountGroup.findById(accountGroupId);
      if (!accountGroup || accountGroup.isDeleted) {
        const error = new Error('Invalid or deleted account group');
        error.status = 400;
        throw error;
      }
      return accountGroup;
    } catch (err) {
      logger.error('Account group validation failed', { accountGroupId, error: err.message });
      throw err;
    }
  }

  /**
   * Validate account number is unique
   * @param {string} accountNumber - Account number
   * @param {string} excludeId - Optional ID to exclude from check (for updates)
   * @returns {Promise<boolean>} - true if unique
   */
  async isAccountNumberUnique(accountNumber, excludeId = null) {
    try {
      const query = {
        accountNumber: accountNumber.toUpperCase(),
        isDeleted: false,
      };

      if (excludeId) {
        query._id = { $ne: excludeId };
      }

      const existing = await ChartOfAccounts.findOne(query);
      return !existing;
    } catch (err) {
      logger.error('Account uniqueness check failed', { accountNumber, error: err.message });
      throw err;
    }
  }

  /**
   * Create a new chart of account
   * @param {Object} accountData - Account details
   * @returns {Promise<Object>} - Created account with populated group
   */
  async createAccount(accountData) {
    try {
      const { accountNumber, accountName, accountGroupId, description, openingBalance, isBank, bankName, accountTypeBank } = accountData;

      // Validate required fields
      if (!accountNumber || !accountName || !accountGroupId) {
        const error = new Error('Account Number, Name, and Group are required');
        error.status = 400;
        throw error;
      }

      // Validate account group exists
      await this.validateAccountGroup(accountGroupId);

      // Check uniqueness
      const isUnique = await this.isAccountNumberUnique(accountNumber);
      if (!isUnique) {
        const error = new Error('Account number already exists');
        error.status = 409;
        throw error;
      }

      // Convert balance to cents (for precision)
      const balance = openingBalance ? parseFloat(openingBalance) : 0;

      const account = new ChartOfAccounts({
        accountNumber: accountNumber.toUpperCase(),
        accountName,
        accountGroupId,
        description,
        openingBalance: balance,
        currentBalance: balance,
        isBank: isBank || false,
        bankName: bankName || '',
        accountTypeBank: accountTypeBank || '',
      });

      await account.save();
      await account.populate('accountGroupId', 'name code type nature');

      logger.info('Chart of account created', { accountId: account._id, accountNumber });
      return account;
    } catch (err) {
      logger.error('Failed to create chart of account', { error: err.message });
      throw err;
    }
  }

  /**
   * Get account by ID
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} - Account with populated group
   */
  async getAccountById(accountId) {
    try {
      const account = await ChartOfAccounts.findById(accountId)
        .populate('accountGroupId', 'name code type nature');

      if (!account) {
        const error = new Error('Account not found');
        error.status = 404;
        throw error;
      }

      logger.info('Retrieved chart of account', { accountId });
      return account;
    } catch (err) {
      logger.error('Failed to get chart of account', { error: err.message, accountId });
      throw err;
    }
  }

  /**
   * Get all accounts with pagination and filters
   * @param {Object} filters - { accountType, groupId, isBank, page, limit }
   * @returns {Promise<Object>} - Paginated accounts
   */
  async getAllAccounts(filters = {}) {
    try {
      const { accountType, groupId, isBank, page = 1, limit = 50 } = filters;
      const skip = (page - 1) * limit;

      let query = { isDeleted: false };

      if (groupId) {
        const group = await AccountGroup.findById(groupId);
        if (group) {
          query.accountGroupId = groupId;
        }
      }

      if (isBank !== undefined) {
        query.isBank = isBank === 'true' || isBank === true;
      }

      const accounts = await ChartOfAccounts.find(query)
        .populate('accountGroupId', 'name code type nature')
        .sort({ accountNumber: 1 })
        .skip(skip)
        .limit(limit);

      const total = await ChartOfAccounts.countDocuments(query);

      logger.info('Retrieved chart of accounts', { count: accounts.length, total });
      return {
        accounts,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (err) {
      logger.error('Failed to get chart of accounts', { error: err.message });
      throw err;
    }
  }

  /**
   * Update an account
   * @param {string} accountId - Account ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object>} - Updated account
   */
  async updateAccount(accountId, updateData) {
    try {
      // Validate account exists
      const account = await ChartOfAccounts.findById(accountId);
      if (!account) {
        const error = new Error('Account not found');
        error.status = 404;
        throw error;
      }

      // Validate account group if updating
      if (updateData.accountGroupId) {
        await this.validateAccountGroup(updateData.accountGroupId);
      }

      // Check uniqueness if updating account number
      if (updateData.accountNumber && updateData.accountNumber !== account.accountNumber) {
        const isUnique = await this.isAccountNumberUnique(updateData.accountNumber, accountId);
        if (!isUnique) {
          const error = new Error('Account number already exists');
          error.status = 409;
          throw error;
        }
        updateData.accountNumber = updateData.accountNumber.toUpperCase();
      }

      // Convert balance to cents if updating
      if (updateData.openingBalance !== undefined) {
        updateData.openingBalance = parseFloat(updateData.openingBalance);
      }

      const updated = await ChartOfAccounts.findByIdAndUpdate(accountId, updateData, {
        returnDocument: 'after',
        runValidators: true,
      }).populate('accountGroupId', 'name code type nature');

      logger.info('Chart of account updated', { accountId, updatedFields: Object.keys(updateData) });
      return updated;
    } catch (err) {
      logger.error('Failed to update chart of account', { error: err.message, accountId });
      throw err;
    }
  }

  /**
   * Update account balance (used by journal entries)
   * @param {string} accountId - Account ID
   * @param {number} debitAmount - Debit amount (in cents)
   * @param {number} creditAmount - Credit amount (in cents)
   * @returns {Promise<Object>} - Updated account
   */
  async updateBalance(accountId, debitAmount = 0, creditAmount = 0) {
    try {
      const account = await ChartOfAccounts.findById(accountId);
      if (!account) {
        const error = new Error('Account not found');
        error.status = 404;
        throw error;
      }

      // Get account nature from group
      const group = await AccountGroup.findById(account.accountGroupId);
      if (!group) {
        logger.warn('Account group not found during balance update', { accountId });
        return account;
      }

      // Update balance based on nature
      // For DEBIT accounts: Debit increases, Credit decreases
      // For CREDIT accounts: Credit increases, Debit decreases
      let balanceChange = 0;
      if (group.nature === 'DEBIT') {
        balanceChange = debitAmount - creditAmount;
      } else {
        balanceChange = creditAmount - debitAmount;
      }

      account.currentBalance = (account.currentBalance || 0) + balanceChange;
      await account.save();

      logger.info('Account balance updated', { accountId, change: balanceChange, newBalance: account.currentBalance });
      return account;
    } catch (err) {
      logger.error('Failed to update account balance', { error: err.message, accountId });
      throw err;
    }
  }

  /**
   * Delete account (soft delete)
   * @param {string} accountId - Account ID
   * @returns {Promise<void>}
   */
  async deleteAccount(accountId) {
    try {
      const account = await ChartOfAccounts.findByIdAndUpdate(accountId, { isDeleted: true }, { returnDocument: 'after' });

      if (!account) {
        const error = new Error('Account not found');
        error.status = 404;
        throw error;
      }

      logger.info('Chart of account deleted (soft)', { accountId });
    } catch (err) {
      logger.error('Failed to delete chart of account', { error: err.message, accountId });
      throw err;
    }
  }

  /**
   * Get accounts by type
   * @param {string} type - Account type (ASSET, LIABILITY, EQUITY, INCOME, EXPENSE)
   * @returns {Promise<Array>} - Accounts of specified type
   */
  async getAccountsByType(type) {
    try {
      const validTypes = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];
      if (!validTypes.includes(type)) {
        const error = new Error(`Invalid account type. Valid types: ${validTypes.join(', ')}`);
        error.status = 400;
        throw error;
      }

      const accounts = await ChartOfAccounts.find({ isDeleted: false })
        .populate('accountGroupId')
        .populate({
          path: 'accountGroupId',
          match: { type },
        })
        .exec();

      // Filter out accounts with null accountGroupId (where type didn't match)
      const filtered = accounts.filter(acc => acc.accountGroupId !== null);

      logger.info('Retrieved accounts by type', { type, count: filtered.length });
      return filtered;
    } catch (err) {
      logger.error('Failed to get accounts by type', { error: err.message, type });
      throw err;
    }
  }

  /**
   * Get account balance
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} - { accountNumber, accountName, openingBalance, currentBalance }
   */
  async getAccountBalance(accountId) {
    try {
      const account = await ChartOfAccounts.findById(accountId);

      if (!account) {
        const error = new Error('Account not found');
        error.status = 404;
        throw error;
      }

      logger.info('Retrieved account balance', { accountId });
      return {
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        openingBalance: account.openingBalance,
        currentBalance: account.currentBalance,
      };
    } catch (err) {
      logger.error('Failed to get account balance', { error: err.message, accountId });
      throw err;
    }
  }

  /**
   * Get trial balance (sum of all accounts by type)
   * @param {string} asOfDate - Optional date for historical balance
   * @returns {Promise<Object>} - Trial balance summary
   */
  async getTrialBalance(asOfDate = null) {
    try {
      const accounts = await ChartOfAccounts.find({ isDeleted: false })
        .populate('accountGroupId');

      let totalDebits = 0;
      let totalCredits = 0;
      const byType = {};

      for (const account of accounts) {
        if (!account.accountGroupId) continue;

        const type = account.accountGroupId.type;
        if (!byType[type]) {
          byType[type] = { accounts: [], total: 0 };
        }

        byType[type].accounts.push({
          accountNumber: account.accountNumber,
          accountName: account.accountName,
          balance: account.currentBalance,
        });

        byType[type].total += account.currentBalance || 0;

        // For trial balance, ASSET and EXPENSE are debits, others are credits
        if (['ASSET', 'EXPENSE'].includes(type)) {
          totalDebits += account.currentBalance || 0;
        } else {
          totalCredits += account.currentBalance || 0;
        }
      }

      const isBalanced = totalDebits === totalCredits;

      logger.info('Generated trial balance', { isBalanced, totalDebits, totalCredits });
      return {
        totalDebits,
        totalCredits,
        isBalanced,
        difference: totalDebits - totalCredits,
        byType,
      };
    } catch (err) {
      logger.error('Failed to generate trial balance', { error: err.message });
      throw err;
    }
  }

  /**
   * Search accounts by number or name
   * @param {string} searchTerm - Account number or name
   * @param {number} limit - Max results
   * @returns {Promise<Array>} - Matching accounts
   */
  async searchAccounts(searchTerm, limit = 20) {
    try {
      if (!searchTerm || searchTerm.length < 2) {
        const error = new Error('Search term must be at least 2 characters');
        error.status = 400;
        throw error;
      }

      const regex = new RegExp(searchTerm, 'i');
      const accounts = await ChartOfAccounts.find({
        $or: [
          { accountNumber: regex },
          { accountName: regex },
        ],
        isDeleted: false,
      })
        .populate('accountGroupId', 'name type')
        .limit(limit);

      logger.info('Searched accounts', { searchTerm, count: accounts.length });
      return accounts;
    } catch (err) {
      logger.error('Failed to search accounts', { error: err.message, searchTerm });
      throw err;
    }
  }
}

export default new ChartOfAccountsService();
