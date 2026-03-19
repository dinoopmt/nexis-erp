/**
 * Account Group Service
 * Manages account groupings and classifications
 */

import AccountGroup from '../../Models/AccountGroup.js';
import ChartOfAccounts from '../../Models/ChartOfAccounts.js';
import logger from '../../../config/logger.js';

class AccountGroupService {
  /**
   * Validate account type and nature
   * @param {string} type - Account type (ASSET, LIABILITY, EQUITY, INCOME, EXPENSE)
   * @param {string} nature - Account nature (DEBIT, CREDIT)
   * @returns {boolean} - true if valid
   */
  validateTypeAndNature(type, nature) {
    const validTypes = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];
    const validNatures = ['DEBIT', 'CREDIT'];

    if (!validTypes.includes(type)) {
      const error = new Error(`Invalid account type. Valid types: ${validTypes.join(', ')}`);
      error.status = 400;
      throw error;
    }

    if (!validNatures.includes(nature)) {
      const error = new Error(`Invalid account nature. Valid natures: ${validNatures.join(', ')}`);
      error.status = 400;
      throw error;
    }

    return true;
  }

  /**
   * Check if group code and name are unique
   * @param {string} code - Group code
   * @param {string} name - Group name
   * @param {string} excludeId - Optional ID to exclude from check
   * @returns {Promise<boolean>} - true if unique
   */
  async isGroupUnique(code, name, excludeId = null) {
    try {
      let query = {
        $or: [
          { code: code.toUpperCase() },
          { name: name.toUpperCase() },
        ],
        isDeleted: false,
      };

      if (excludeId) {
        query._id = { $ne: excludeId };
      }

      const existing = await AccountGroup.findOne(query);
      return !existing;
    } catch (err) {
      logger.error('Group uniqueness check failed', { code, name, error: err.message });
      throw err;
    }
  }

  /**
   * Create a new account group
   * @param {Object} groupData - Group details
   * @returns {Promise<Object>} - Created group
   */
  async createAccountGroup(groupData) {
    try {
      const { name, code, description, type, nature, level, parentGroupId, sortOrder } = groupData;

      // Validate required fields
      if (!name || !code || !type || !nature) {
        const error = new Error('Name, Code, Type, and Nature are required');
        error.status = 400;
        throw error;
      }

      // Validate type and nature
      this.validateTypeAndNature(type, nature);

      // Check uniqueness
      const isUnique = await this.isGroupUnique(code, name);
      if (!isUnique) {
        const error = new Error('Account group code or name already exists');
        error.status = 409;
        throw error;
      }

      // Validate parent group if provided
      if (parentGroupId) {
        const parentGroup = await AccountGroup.findById(parentGroupId);
        if (!parentGroup || parentGroup.isDeleted) {
          const error = new Error('Invalid parent group');
          error.status = 400;
          throw error;
        }
      }

      const accountGroup = new AccountGroup({
        name: name.toUpperCase(),
        code: code.toUpperCase(),
        description,
        type,
        nature,
        level: level || 2,
        parentGroupId: parentGroupId || null,
        sortOrder: sortOrder || 0,
      });

      await accountGroup.save();

      logger.info('Account group created', { groupId: accountGroup._id, code });
      return accountGroup;
    } catch (err) {
      logger.error('Failed to create account group', { error: err.message });
      throw err;
    }
  }

  /**
   * Get group by ID
   * @param {string} groupId - Group ID
   * @returns {Promise<Object>} - Group with children count
   */
  async getGroupById(groupId) {
    try {
      const group = await AccountGroup.findById(groupId);

      if (!group) {
        const error = new Error('Account group not found');
        error.status = 404;
        throw error;
      }

      // Get count of accounts in this group
      const accountCount = await ChartOfAccounts.countDocuments({
        accountGroupId: groupId,
        isDeleted: false,
      });

      logger.info('Retrieved account group', { groupId });
      return {
        ...group.toObject(),
        accountCount,
      };
    } catch (err) {
      logger.error('Failed to get account group', { error: err.message, groupId });
      throw err;
    }
  }

  /**
   * Get all groups with optional filtering
   * @param {Object} filters - { type, nature, page, limit }
   * @returns {Promise<Object>} - Paginated groups
   */
  async getAllGroups(filters = {}) {
    try {
      const { type, nature, page = 1, limit = 50 } = filters;
      const skip = (page - 1) * limit;

      let query = { isDeleted: false };

      if (type) query.type = type;
      if (nature) query.nature = nature;

      const groups = await AccountGroup.find(query)
        .sort({ sortOrder: 1, code: 1 })
        .skip(skip)
        .limit(limit);

      const total = await AccountGroup.countDocuments(query);

      // Get account counts for each group
      const enriched = await Promise.all(
        groups.map(async (group) => {
          const accountCount = await ChartOfAccounts.countDocuments({
            accountGroupId: group._id,
            isDeleted: false,
          });
          return {
            ...group.toObject(),
            accountCount,
          };
        })
      );

      logger.info('Retrieved account groups', { count: groups.length, total });
      return {
        groups: enriched,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (err) {
      logger.error('Failed to get account groups', { error: err.message });
      throw err;
    }
  }

  /**
   * Get groups by type
   * @param {string} type - Account type (ASSET, LIABILITY, EQUITY, INCOME, EXPENSE)
   * @returns {Promise<Array>} - Groups of specified type
   */
  async getGroupsByType(type) {
    try {
      const validTypes = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];
      if (!validTypes.includes(type)) {
        const error = new Error(`Invalid type. Valid types: ${validTypes.join(', ')}`);
        error.status = 400;
        throw error;
      }

      const groups = await AccountGroup.find({ type, isDeleted: false })
        .sort({ sortOrder: 1, code: 1 });

      logger.info('Retrieved groups by type', { type, count: groups.length });
      return groups;
    } catch (err) {
      logger.error('Failed to get groups by type', { error: err.message, type });
      throw err;
    }
  }

  /**
   * Update a group
   * @param {string} groupId - Group ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object>} - Updated group
   */
  async updateAccountGroup(groupId, updateData) {
    try {
      const group = await AccountGroup.findById(groupId);

      if (!group) {
        const error = new Error('Account group not found');
        error.status = 404;
        throw error;
      }

      // Validate type and nature if updating
      if (updateData.type || updateData.nature) {
        const type = updateData.type || group.type;
        const nature = updateData.nature || group.nature;
        this.validateTypeAndNature(type, nature);
      }

      // Check uniqueness if updating code or name
      if (updateData.code || updateData.name) {
        const code = updateData.code || group.code;
        const name = updateData.name || group.name;
        if (code !== group.code || name !== group.name) {
          const isUnique = await this.isGroupUnique(code, name, groupId);
          if (!isUnique) {
            const error = new Error('Code or name already exists');
            error.status = 409;
            throw error;
          }
        }
        if (updateData.code) updateData.code = updateData.code.toUpperCase();
        if (updateData.name) updateData.name = updateData.name.toUpperCase();
      }

      // Validate parent group if updating
      if (updateData.parentGroupId && updateData.parentGroupId !== null) {
        const parentGroup = await AccountGroup.findById(updateData.parentGroupId);
        if (!parentGroup || parentGroup.isDeleted) {
          const error = new Error('Invalid parent group');
          error.status = 400;
          throw error;
        }
      }

      const updated = await AccountGroup.findByIdAndUpdate(groupId, updateData, {
        new: true,
        runValidators: true,
      });

      logger.info('Account group updated', { groupId, updatedFields: Object.keys(updateData) });
      return updated;
    } catch (err) {
      logger.error('Failed to update account group', { error: err.message, groupId });
      throw err;
    }
  }

  /**
   * Delete a group (soft delete)
   * @param {string} groupId - Group ID
   * @returns {Promise<void>}
   */
  async deleteAccountGroup(groupId) {
    try {
      // Check if group has accounts
      const accountCount = await ChartOfAccounts.countDocuments({
        accountGroupId: groupId,
        isDeleted: false,
      });

      if (accountCount > 0) {
        const error = new Error(`Cannot delete group with ${accountCount} accounts. Delete accounts first.`);
        error.status = 409;
        throw error;
      }

      const group = await AccountGroup.findByIdAndUpdate(groupId, { isDeleted: true }, { new: true });

      if (!group) {
        const error = new Error('Account group not found');
        error.status = 404;
        throw error;
      }

      logger.info('Account group deleted (soft)', { groupId });
    } catch (err) {
      logger.error('Failed to delete account group', { error: err.message, groupId });
      throw err;
    }
  }

  /**
   * Get group hierarchy
   * @returns {Promise<Array>} - Groups organized by type and level
   */
  async getGroupHierarchy() {
    try {
      const groups = await AccountGroup.find({ isDeleted: false }).sort({ type: 1, level: 1, code: 1 });

      // Organize by type
      const hierarchy = {};
      const types = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];

      for (const type of types) {
        hierarchy[type] = groups.filter((g) => g.type === type);
      }

      logger.info('Retrieved group hierarchy');
      return hierarchy;
    } catch (err) {
      logger.error('Failed to get group hierarchy', { error: err.message });
      throw err;
    }
  }

  /**
   * Get accounts in group
   * @param {string} groupId - Group ID
   * @param {Object} filters - { page, limit }
   * @returns {Promise<Object>} - Paginated accounts in group
   */
  async getGroupAccounts(groupId, filters = {}) {
    try {
      const { page = 1, limit = 20 } = filters;
      const skip = (page - 1) * limit;

      // Verify group exists
      const group = await AccountGroup.findById(groupId);
      if (!group) {
        const error = new Error('Account group not found');
        error.status = 404;
        throw error;
      }

      const accounts = await ChartOfAccounts.find({
        accountGroupId: groupId,
        isDeleted: false,
      })
        .sort({ accountNumber: 1 })
        .skip(skip)
        .limit(limit);

      const total = await ChartOfAccounts.countDocuments({
        accountGroupId: groupId,
        isDeleted: false,
      });

      logger.info('Retrieved group accounts', { groupId, count: accounts.length });
      return {
        accounts,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (err) {
      logger.error('Failed to get group accounts', { error: err.message, groupId });
      throw err;
    }
  }
}

export default new AccountGroupService();
