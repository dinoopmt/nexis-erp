/**
 * Financial Year Service
 * Manages financial/fiscal periods for accounting and reporting
 */

import FinancialYear from '../../../Models/FinancialYear.js';
import logger from '../../../config/logger.js';

class FinancialYearService {
  /**
   * Validate financial year dates
   */
  validateFinancialYearDates(startDate, endDate) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        const error = new Error('Invalid date format');
        error.status = 400;
        throw error;
      }

      if (end <= start) {
        const error = new Error('End date must be after start date');
        error.status = 400;
        throw error;
      }

      return true;
    } catch (error) {
      logger.error('Error validating financial year dates', { error });
      throw error;
    }
  }

  /**
   * Check for overlapping financial years
   */
  async checkDateOverlap(startDate, endDate, excludeId = null) {
    try {
      const query = {
        isDeleted: false,
        $or: [
          { startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } }
        ]
      };

      if (excludeId) {
        query._id = { $ne: excludeId };
      }

      const overlapping = await FinancialYear.findOne(query);
      return overlapping;
    } catch (error) {
      logger.error('Error checking date overlap', { error });
      throw error;
    }
  }

  /**
   * Create financial year
   */
  async createFinancialYear(fyData) {
    try {
      const { yearCode, yearName, startDate, endDate, remarks } = fyData;

      // Validation
      if (!yearCode || !yearCode.trim()) {
        const error = new Error('Year code is required');
        error.status = 400;
        throw error;
      }

      if (!yearName || !yearName.trim()) {
        const error = new Error('Year name is required');
        error.status = 400;
        throw error;
      }

      if (!startDate || !endDate) {
        const error = new Error('Start date and end date are required');
        error.status = 400;
        throw error;
      }

      // Validate dates
      this.validateFinancialYearDates(startDate, endDate);

      // Check for duplicate year code
      const existing = await FinancialYear.findOne({
        yearCode: yearCode.toUpperCase(),
        isDeleted: false,
      });

      if (existing) {
        const error = new Error('Financial year with this code already exists');
        error.status = 409;
        throw error;
      }

      // Check for overlapping dates
      const overlapping = await this.checkDateOverlap(startDate, endDate);
      if (overlapping) {
        const error = new Error(`Date range overlaps with existing financial year: ${overlapping.yearCode}`);
        error.status = 409;
        throw error;
      }

      // Get previous financial year
      const previousYear = await FinancialYear.findOne({
        endDate: { $lt: new Date(startDate) },
        isDeleted: false,
      }).sort({ endDate: -1 });

      const financialYear = new FinancialYear({
        yearCode: yearCode.toUpperCase(),
        yearName: yearName.trim(),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: 'OPEN',
        isCurrent: false,
        allowPosting: true,
        previousYearId: previousYear?._id || null,
        remarks: remarks?.trim() || '',
        isDeleted: false,
      });

      await financialYear.save();

      logger.info('Financial year created', {
        yearCode: financialYear.yearCode,
        yearName: financialYear.yearName,
        startDate,
        endDate,
      });

      return financialYear;
    } catch (error) {
      logger.error('Error creating financial year', { error });
      throw error;
    }
  }

  /**
   * Get financial year by ID
   */
  async getFinancialYearById(fyId) {
    try {
      if (!fyId) {
        const error = new Error('Financial year ID is required');
        error.status = 400;
        throw error;
      }

      const fy = await FinancialYear.findOne({ _id: fyId, isDeleted: false })
        .populate('previousYearId', 'yearCode yearName');

      if (!fy) {
        const error = new Error('Financial year not found');
        error.status = 404;
        throw error;
      }

      return fy;
    } catch (error) {
      logger.error('Error fetching financial year', { fyId, error });
      throw error;
    }
  }

  /**
   * Get financial year by code
   */
  async getFinancialYearByCode(yearCode) {
    try {
      if (!yearCode || !yearCode.trim()) {
        const error = new Error('Year code is required');
        error.status = 400;
        throw error;
      }

      const fy = await FinancialYear.findOne({
        yearCode: yearCode.toUpperCase(),
        isDeleted: false,
      }).populate('previousYearId', 'yearCode yearName');

      if (!fy) {
        const error = new Error('Financial year not found');
        error.status = 404;
        throw error;
      }

      return fy;
    } catch (error) {
      logger.error('Error fetching financial year by code', { yearCode, error });
      throw error;
    }
  }

  /**
   * Get all financial years with pagination
   */
  async getAllFinancialYears(filters) {
    try {
      const page = Math.max(1, filters.page || 1);
      const limit = Math.max(1, Math.min(100, filters.limit || 50));

      const query = { isDeleted: false };

      // Filter by status
      if (filters.status && ['OPEN', 'CLOSED', 'LOCKED'].includes(filters.status)) {
        query.status = filters.status;
      }

      // Filter by current year
      if (filters.isCurrent !== undefined) {
        query.isCurrent = filters.isCurrent === true;
      }

      const total = await FinancialYear.countDocuments(query);
      const financialYears = await FinancialYear.find(query)
        .populate('previousYearId', 'yearCode yearName')
        .sort({ startDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      return {
        financialYears,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error fetching financial years', { error });
      throw error;
    }
  }

  /**
   * Get current active financial year
   */
  async getCurrentFinancialYear() {
    try {
      const currentFY = await FinancialYear.findOne({
        isCurrent: true,
        isDeleted: false,
      }).populate('previousYearId', 'yearCode yearName');

      if (!currentFY) {
        const error = new Error('No current financial year set');
        error.status = 404;
        throw error;
      }

      return currentFY;
    } catch (error) {
      logger.error('Error fetching current financial year', { error });
      throw error;
    }
  }

  /**
   * Set current financial year
   */
  async setCurrentFinancialYear(fyId) {
    try {
      if (!fyId) {
        const error = new Error('Financial year ID is required');
        error.status = 400;
        throw error;
      }

      // Fetch the target FY
      const targetFY = await this.getFinancialYearById(fyId);

      if (targetFY.status === 'LOCKED') {
        const error = new Error('Cannot set locked financial year as current');
        error.status = 409;
        throw error;
      }

      // Remove current flag from all other FYs
      await FinancialYear.updateMany(
        { isCurrent: true, isDeleted: false },
        { isCurrent: false }
      );

      // Set new current FY
      targetFY.isCurrent = true;
      await targetFY.save();

      logger.info('Current financial year changed', { yearCode: targetFY.yearCode });

      return targetFY;
    } catch (error) {
      logger.error('Error setting current financial year', { fyId, error });
      throw error;
    }
  }

  /**
   * Update financial year
   */
  async updateFinancialYear(fyId, updateData) {
    try {
      if (!fyId) {
        const error = new Error('Financial year ID is required');
        error.status = 400;
        throw error;
      }

      const fy = await this.getFinancialYearById(fyId);

      // Check posting allowance
      if (fy.status === 'LOCKED') {
        const error = new Error('Cannot update locked financial year');
        error.status = 409;
        throw error;
      }

      // Update allowed fields
      const allowedFields = ['yearName', 'remarks'];

      allowedFields.forEach(field => {
        if (updateData.hasOwnProperty(field) && updateData[field] !== undefined) {
          fy[field] = updateData[field];
        }
      });

      fy.updatedAt = new Date();
      await fy.save();

      logger.info('Financial year updated', { fyId });

      return fy;
    } catch (error) {
      logger.error('Error updating financial year', { fyId, error });
      throw error;
    }
  }

  /**
   * Close financial year
   */
  async closeFinancialYear(fyId, closedBy) {
    try {
      if (!fyId) {
        const error = new Error('Financial year ID is required');
        error.status = 400;
        throw error;
      }

      const fy = await this.getFinancialYearById(fyId);

      if (fy.status === 'CLOSED' || fy.status === 'LOCKED') {
        const error = new Error(`Financial year is already ${fy.status.toLowerCase()}`);
        error.status = 409;
        throw error;
      }

      fy.status = 'CLOSED';
      fy.closingDate = new Date();
      fy.closedBy = closedBy;
      fy.allowPosting = false;

      await fy.save();

      logger.info('Financial year closed', { yearCode: fy.yearCode, closedBy });

      return fy;
    } catch (error) {
      logger.error('Error closing financial year', { fyId, error });
      throw error;
    }
  }

  /**
   * Lock financial year (permanent)
   */
  async lockFinancialYear(fyId, lockedBy) {
    try {
      if (!fyId) {
        const error = new Error('Financial year ID is required');
        error.status = 400;
        throw error;
      }

      const fy = await this.getFinancialYearById(fyId);

      if (fy.status === 'LOCKED') {
        const error = new Error('Financial year is already locked');
        error.status = 409;
        throw error;
      }

      if (fy.isCurrent) {
        const error = new Error('Cannot lock current financial year');
        error.status = 409;
        throw error;
      }

      fy.status = 'LOCKED';
      fy.lockedDate = new Date();
      fy.lockedBy = lockedBy;
      fy.allowPosting = false;

      await fy.save();

      logger.info('Financial year locked', { yearCode: fy.yearCode, lockedBy });

      return fy;
    } catch (error) {
      logger.error('Error locking financial year', { fyId, error });
      throw error;
    }
  }

  /**
   * Delete financial year (soft delete)
   */
  async deleteFinancialYear(fyId) {
    try {
      if (!fyId) {
        const error = new Error('Financial year ID is required');
        error.status = 400;
        throw error;
      }

      const fy = await this.getFinancialYearById(fyId);

      if (fy.isCurrent) {
        const error = new Error('Cannot delete current financial year');
        error.status = 409;
        throw error;
      }

      fy.isDeleted = true;
      fy.deletedAt = new Date();

      await fy.save();

      logger.info('Financial year deleted', { yearCode: fy.yearCode });

      return { message: 'Financial year deleted successfully' };
    } catch (error) {
      logger.error('Error deleting financial year', { fyId, error });
      throw error;
    }
  }

  /**
   * Get financial year for date
   */
  async getFinancialYearForDate(date) {
    try {
      const checkDate = new Date(date);

      if (isNaN(checkDate.getTime())) {
        const error = new Error('Invalid date format');
        error.status = 400;
        throw error;
      }

      const fy = await FinancialYear.findOne({
        startDate: { $lte: checkDate },
        endDate: { $gte: checkDate },
        isDeleted: false,
      });

      if (!fy) {
        const error = new Error('No financial year found for the given date');
        error.status = 404;
        throw error;
      }

      return fy;
    } catch (error) {
      logger.error('Error getting financial year for date', { date, error });
      throw error;
    }
  }

  /**
   * Check if posting is allowed in financial year
   */
  async isPostingAllowed(fyId) {
    try {
      if (!fyId) {
        const error = new Error('Financial year ID is required');
        error.status = 400;
        throw error;
      }

      const fy = await this.getFinancialYearById(fyId);

      return fy.allowPosting && fy.status === 'OPEN';
    } catch (error) {
      logger.error('Error checking posting allowance', { fyId, error });
      throw error;
    }
  }

  /**
   * Get financial year statistics
   */
  async getFinancialYearStatistics() {
    try {
      const total = await FinancialYear.countDocuments({ isDeleted: false });
      const byStatus = await FinancialYear.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);

      const current = await FinancialYear.countDocuments({
        isCurrent: true,
        isDeleted: false,
      });

      return {
        totalFinancialYears: total,
        currentFinancialYear: current,
        byStatus: byStatus,
      };
    } catch (error) {
      logger.error('Error getting financial year statistics', { error });
      throw error;
    }
  }
}

export default new FinancialYearService();
