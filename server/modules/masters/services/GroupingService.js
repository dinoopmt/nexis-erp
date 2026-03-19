/**
 * Grouping Service
 * Manages hierarchical product categories and classifications
 */

import Grouping from '../../../Models/Grouping.js';
import logger from '../../../config/logger.js';

class GroupingService {
  /**
   * Validate grouping hierarchy
   */
  async validateGroupingHierarchy(parentId, levelLimit = 3) {
    try {
      if (!parentId) {
        return { valid: true, level: 0 };
      }

      const parent = await Grouping.findOne({
        _id: parentId,
        isDeleted: false,
      });

      if (!parent) {
        const error = new Error('Parent grouping not found');
        error.status = 404;
        throw error;
      }

      if (parent.level >= levelLimit) {
        const error = new Error(`Maximum hierarchy depth (${levelLimit} levels) reached`);
        error.status = 400;
        throw error;
      }

      return {
        valid: true,
        level: parent.level + 1,
        parentName: parent.name,
      };
    } catch (error) {
      logger.error('Error validating grouping hierarchy', { parentId, error });
      throw error;
    }
  }

  /**
   * Create grouping
   */
  async createGrouping(groupingData) {
    try {
      const { name, description, parentId } = groupingData;

      // Validation
      if (!name || !name.trim()) {
        const error = new Error('Grouping name is required');
        error.status = 400;
        throw error;
      }

      const uppercaseName = name.toUpperCase();

      // Check if grouping name already exists at same level
      const query = {
        name: uppercaseName,
        isDeleted: false,
      };

      if (parentId) {
        query.parentId = parentId;
      } else {
        query.parentId = null;
      }

      const existing = await Grouping.findOne(query);

      if (existing) {
        const error = new Error('Grouping with this name already exists at the same level');
        error.status = 409;
        throw error;
      }

      // Validate hierarchy
      const hierarchy = await this.validateGroupingHierarchy(parentId);

      const grouping = new Grouping({
        name: uppercaseName,
        description: description?.trim() || '',
        parentId: parentId || null,
        level: hierarchy.level,
        isDeleted: false,
      });

      await grouping.save();

      // Populate parent for response
      await grouping.populate('parentId', 'name level code');

      logger.info('Grouping created', {
        name: grouping.name,
        level: grouping.level,
        parentId: grouping.parentId,
      });

      return grouping;
    } catch (error) {
      logger.error('Error creating grouping', { error });
      throw error;
    }
  }

  /**
   * Get grouping by ID
   */
  async getGroupingById(groupingId) {
    try {
      if (!groupingId) {
        const error = new Error('Grouping ID is required');
        error.status = 400;
        throw error;
      }

      const grouping = await Grouping.findOne({
        _id: groupingId,
        isDeleted: false,
      }).populate('parentId', 'name level');

      if (!grouping) {
        const error = new Error('Grouping not found');
        error.status = 404;
        throw error;
      }

      return grouping;
    } catch (error) {
      logger.error('Error fetching grouping by ID', { groupingId, error });
      throw error;
    }
  }

  /**
   * Get grouping by name
   */
  async getGroupingByName(name) {
    try {
      if (!name || !name.trim()) {
        const error = new Error('Grouping name is required');
        error.status = 400;
        throw error;
      }

      const grouping = await Grouping.findOne({
        name: name.toUpperCase(),
        isDeleted: false,
      }).populate('parentId', 'name level');

      if (!grouping) {
        const error = new Error('Grouping not found');
        error.status = 404;
        throw error;
      }

      return grouping;
    } catch (error) {
      logger.error('Error fetching grouping by name', { name, error });
      throw error;
    }
  }

  /**
   * Get all groupings with hierarchical structure
   */
  async getAllGroupings(filters) {
    try {
      const page = Math.max(1, filters.page || 1);
      const limit = Math.max(1, Math.min(100, filters.limit || 50));
      const level = filters.level !== undefined ? parseInt(filters.level) : null;

      const query = { isDeleted: false };

      // Filter by level
      if (level !== null && level >= 0) {
        query.level = level;
      }

      const total = await Grouping.countDocuments(query);
      const groupings = await Grouping.find(query)
        .populate('parentId', 'name level')
        .sort({ level: 1, name: 1 })
        .skip((page - 1) * limit)
        .limit(limit);

      // Build hierarchy
      const hierarchy = this.buildHierarchy(groupings);

      return {
        groupings,
        hierarchy,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error fetching all groupings', { error });
      throw error;
    }
  }

  /**
   * Build hierarchical structure
   */
  buildHierarchy(groupings) {
    try {
      const hierarchy = {
        departments: [],
        subdepartments: {},
      };

      // Separate by level
      const byLevel = {
        0: [],
        1: [],
        2: [],
      };

      groupings.forEach(g => {
        if (g.level <= 2) {
          byLevel[g.level].push(g);
        }
      });

      // Build departments (level 0)
      hierarchy.departments = byLevel[0];

      // Build subdepartments mapping
      byLevel[1].forEach(sub => {
        const parentId = sub.parentId?._id?.toString();
        if (!hierarchy.subdepartments[parentId]) {
          hierarchy.subdepartments[parentId] = [];
        }
        hierarchy.subdepartments[parentId].push(sub);
      });

      return hierarchy;
    } catch (error) {
      logger.error('Error building hierarchy', { error });
      throw error;
    }
  }

  /**
   * Get department (level 0 grouping)
   */
  async getDepartments(limit = 100) {
    try {
      if (limit < 1 || limit > 500) {
        const error = new Error('Limit must be between 1 and 500');
        error.status = 400;
        throw error;
      }

      const departments = await Grouping.find({
        level: 0,
        isDeleted: false,
      })
        .limit(limit)
        .sort({ name: 1 });

      return departments;
    } catch (error) {
      logger.error('Error fetching departments', { error });
      throw error;
    }
  }

  /**
   * Get sub-groupings for a parent
   */
  async getSubGroupings(parentId) {
    try {
      if (!parentId) {
        const error = new Error('Parent ID is required');
        error.status = 400;
        throw error;
      }

      const parent = await this.getGroupingById(parentId);

      const subGroupings = await Grouping.find({
        parentId,
        isDeleted: false,
      })
        .populate('parentId', 'name level')
        .sort({ name: 1 });

      return {
        parent: {
          _id: parent._id,
          name: parent.name,
          level: parent.level,
        },
        subGroupings,
      };
    } catch (error) {
      logger.error('Error fetching sub-groupings', { parentId, error });
      throw error;
    }
  }

  /**
   * Get complete hierarchy path for grouping
   */
  async getGroupingPath(groupingId) {
    try {
      if (!groupingId) {
        const error = new Error('Grouping ID is required');
        error.status = 400;
        throw error;
      }

      const grouping = await this.getGroupingById(groupingId);
      const path = [grouping];

      let currentParentId = grouping.parentId;

      // Traverse up to root
      while (currentParentId) {
        const parent = await Grouping.findOne({
          _id: currentParentId,
          isDeleted: false,
        }).populate('parentId');

        if (!parent) break;

        path.unshift(parent);
        currentParentId = parent.parentId;
      }

      return path;
    } catch (error) {
      logger.error('Error getting grouping path', { groupingId, error });
      throw error;
    }
  }

  /**
   * Update grouping
   */
  async updateGrouping(groupingId, updateData) {
    try {
      if (!groupingId) {
        const error = new Error('Grouping ID is required');
        error.status = 400;
        throw error;
      }

      const grouping = await this.getGroupingById(groupingId);

      // Update allowed fields
      if (updateData.name && updateData.name.trim()) {
        const uppercaseName = updateData.name.toUpperCase();

        // Check if new name conflicts with existing grouping at same level
        const query = {
          name: uppercaseName,
          _id: { $ne: groupingId },
          isDeleted: false,
        };

        if (grouping.parentId) {
          query.parentId = grouping.parentId;
        } else {
          query.parentId = null;
        }

        const existing = await Grouping.findOne(query);
        if (existing) {
          const error = new Error('Grouping with this name already exists at the same level');
          error.status = 409;
          throw error;
        }

        grouping.name = uppercaseName;
      }

      if (updateData.description !== undefined) {
        grouping.description = updateData.description?.trim() || '';
      }

      grouping.updatedAt = new Date();
      await grouping.save();

      logger.info('Grouping updated', { groupingId });

      return grouping;
    } catch (error) {
      logger.error('Error updating grouping', { groupingId, error });
      throw error;
    }
  }

  /**
   * Delete grouping (soft delete) - only if no children
   */
  async deleteGrouping(groupingId) {
    try {
      if (!groupingId) {
        const error = new Error('Grouping ID is required');
        error.status = 400;
        throw error;
      }

      const grouping = await this.getGroupingById(groupingId);

      // Check for child groupings
      const hasChildren = await Grouping.findOne({
        parentId: groupingId,
        isDeleted: false,
      });

      if (hasChildren) {
        const error = new Error('Cannot delete grouping that has sub-groupings');
        error.status = 409;
        throw error;
      }

      grouping.isDeleted = true;
      grouping.deletedAt = new Date();

      await grouping.save();

      logger.info('Grouping deleted', { groupingId, name: grouping.name });

      return { message: 'Grouping deleted successfully' };
    } catch (error) {
      logger.error('Error deleting grouping', { groupingId, error });
      throw error;
    }
  }

  /**
   * Search groupings
   */
  async searchGroupings(searchTerm, limit = 50) {
    try {
      if (!searchTerm || !searchTerm.trim()) {
        const error = new Error('Search term is required');
        error.status = 400;
        throw error;
      }

      if (limit < 1 || limit > 100) {
        const error = new Error('Limit must be between 1 and 100');
        error.status = 400;
        throw error;
      }

      const groupings = await Grouping.find(
        {
          $or: [
            { name: { $regex: searchTerm, $options: 'i' } },
            { description: { $regex: searchTerm, $options: 'i' } },
          ],
          isDeleted: false,
        },
        {
          _id: 1,
          name: 1,
          description: 1,
          level: 1,
          parentId: 1,
        }
      )
        .populate('parentId', 'name level')
        .limit(limit)
        .sort({ level: 1, name: 1 });

      return groupings;
    } catch (error) {
      logger.error('Error searching groupings', { searchTerm, error });
      throw error;
    }
  }

  /**
   * Get grouping statistics
   */
  async getGroupingStatistics() {
    try {
      const total = await Grouping.countDocuments({ isDeleted: false });

      const byLevel = await Grouping.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$level', count: { $sum: 1 } } },
      ]);

      return {
        totalGroupings: total,
        byLevel: byLevel,
      };
    } catch (error) {
      logger.error('Error getting grouping statistics', { error });
      throw error;
    }
  }
}

export default new GroupingService();
