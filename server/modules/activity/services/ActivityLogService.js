import logger from '../../../config/logger.js';
import { AppError } from '../../../config/errorHandler.js';

/**
 * ActivityLogService
 * Handles all system activity logging and event tracking
 * Records user actions, system events, and operational activities
 */
class ActivityLogService {
  /**
   * Log user activity
   * @param {Object} activityData - { userId, action, module, description, resourceType, resourceId, status, ipAddress, userAgent }
   * @returns {Promise<Object>} - Created activity log
   */
  static async logUserActivity(activityData) {
    try {
      const {
        userId,
        action,
        module,
        description,
        resourceType,
        resourceId,
        status = 'Success',
        ipAddress,
        userAgent,
      } = activityData;

      if (!userId || !action || !module) {
        throw new Error('User ID, Action, and Module are required');
      }

      const validStatuses = ['Success', 'Failed', 'Pending', 'Cancelled'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status. Valid statuses: ${validStatuses.join(', ')}`);
      }

      const activity = {
        activityId: `ACT_${new Date().getTime()}`,
        userId,
        action,
        module,
        description,
        resourceType,
        resourceId,
        status,
        ipAddress,
        userAgent,
        timestamp: new Date(),
        duration: null,
      };

      logger.info('User activity logged', {
        activityId: activity.activityId,
        userId,
        action,
        module,
        status,
      });

      return activity;
    } catch (error) {
      logger.error('Error logging user activity', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get user activity history
   * @param {string} userId - User ID
   * @param {Object} filters - { limit, fromDate, toDate, action, module, status }
   * @returns {Promise<Array>} - Activity logs
   */
  static async getUserActivityHistory(userId, filters = {}) {
    try {
      const { limit = 50, fromDate, toDate, action, module, status } = filters;

      if (!userId) {
        throw new Error('User ID is required');
      }

      if (limit > 500) {
        throw new Error('Limit cannot exceed 500');
      }

      // In real implementation, query from database
      let activities = [
        {
          activityId: 'ACT_001',
          userId,
          action: 'Login',
          module: 'Auth',
          description: 'User logged in',
          status: 'Success',
          timestamp: new Date(),
          ipAddress: '192.168.1.1',
        },
        {
          activityId: 'ACT_002',
          userId,
          action: 'Create',
          module: 'Sales',
          description: 'Created new sales order',
          resourceType: 'SalesOrder',
          resourceId: 'SO_001',
          status: 'Success',
          timestamp: new Date(new Date().getTime() - 1 * 60 * 60 * 1000),
        },
        {
          activityId: 'ACT_003',
          userId,
          action: 'Update',
          module: 'Inventory',
          description: 'Updated stock quantity',
          resourceType: 'Stock',
          resourceId: 'STK_001',
          status: 'Success',
          timestamp: new Date(new Date().getTime() - 2 * 60 * 60 * 1000),
        },
      ];

      if (action) {
        activities = activities.filter((a) => a.action === action);
      }
      if (module) {
        activities = activities.filter((a) => a.module === module);
      }
      if (status) {
        activities = activities.filter((a) => a.status === status);
      }

      logger.info('User activity history retrieved', {
        userId,
        totalActivities: activities.length,
      });

      return activities.slice(0, limit);
    } catch (error) {
      logger.error('Error retrieving user activity history', { error: error.message, userId });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get all system activities
   * @param {Object} filters - { userId, action, module, status, limit, fromDate, toDate }
   * @returns {Promise<Array>} - All activities
   */
  static async getAllSystemActivities(filters = {}) {
    try {
      const { userId, action, module, status, limit = 100, fromDate, toDate } = filters;

      if (limit > 1000) {
        throw new Error('Limit cannot exceed 1000');
      }

      // In real implementation, query from database
      let activities = [
        {
          activityId: 'ACT_001',
          userId: 'USER_001',
          action: 'Create',
          module: 'Sales',
          status: 'Success',
          timestamp: new Date(),
        },
        {
          activityId: 'ACT_002',
          userId: 'USER_002',
          action: 'Delete',
          module: 'Inventory',
          status: 'Failed',
          timestamp: new Date(),
        },
      ];

      if (userId) activities = activities.filter((a) => a.userId === userId);
      if (action) activities = activities.filter((a) => a.action === action);
      if (module) activities = activities.filter((a) => a.module === module);
      if (status) activities = activities.filter((a) => a.status === status);

      logger.info('All system activities retrieved', {
        totalActivities: activities.length,
        filters,
      });

      return activities.slice(0, limit);
    } catch (error) {
      logger.error('Error retrieving system activities', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get activity statistics
   * @param {Object} filters - { fromDate, toDate, groupBy }
   * @returns {Promise<Object>} - Activity statistics
   */
  static async getActivityStatistics(filters = {}) {
    try {
      const { fromDate, toDate, groupBy = 'action' } = filters;

      const stats = {
        totalActivities: 1250,
        successfulActivities: 1200,
        failedActivities: 50,
        successRate: 96.0,
        averageActivitiesPerUser: 125,
        topActions: [
          { action: 'View', count: 450 },
          { action: 'Update', count: 380 },
          { action: 'Create', count: 250 },
          { action: 'Delete', count: 80 },
          { action: 'Download', count: 90 },
        ],
        topModules: [
          { module: 'Sales', count: 350 },
          { module: 'Inventory', count: 300 },
          { module: 'Accounting', count: 280 },
          { module: 'Purchasing', count: 190 },
          { module: 'Customers', count: 140 },
        ],
        activitiesByHour: [
          { hour: '06:00', count: 45 },
          { hour: '08:00', count: 120 },
          { hour: '12:00', count: 180 },
          { hour: '15:00', count: 250 },
          { hour: '18:00', count: 180 },
        ],
        period: { fromDate, toDate },
      };

      logger.info('Activity statistics retrieved', {
        totalActivities: stats.totalActivities,
        successRate: stats.successRate,
      });

      return stats;
    } catch (error) {
      logger.error('Error retrieving activity statistics', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Search activities
   * @param {Object} searchParams - { keyword, userId, action, module, fromDate, toDate, limit }
   * @returns {Promise<Array>} - Matching activities
   */
  static async searchActivities(searchParams) {
    try {
      const { keyword, userId, action, module, limit = 50 } = searchParams;

      if (!keyword && !userId && !action && !module) {
        throw new Error('At least one search parameter is required');
      }

      // In real implementation, perform database search
      let results = [
        {
          activityId: 'ACT_001',
          userId: 'USER_001',
          action: 'Create',
          module: 'Sales',
          description: 'Created sales order',
          timestamp: new Date(),
        },
      ];

      logger.info('Activities searched', {
        totalResults: results.length,
        keyword,
      });

      return results.slice(0, limit);
    } catch (error) {
      logger.error('Error searching activities', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Export activity logs
   * @param {Object} filters - { fromDate, toDate, userId, module, format }
   * @returns {Promise<Object>} - Export file reference
   */
  static async exportActivityLogs(filters) {
    try {
      const { fromDate, toDate, userId, module, format = 'CSV' } = filters;

      const validFormats = ['CSV', 'Excel', 'JSON'];
      if (!validFormats.includes(format)) {
        throw new Error(`Invalid format. Valid formats: ${validFormats.join(', ')}`);
      }

      // In real implementation, generate export file
      const export_data = {
        exportId: `EXP_${new Date().getTime()}`,
        format,
        filters: { fromDate, toDate, userId, module },
        totalRecords: 1250,
        fileSize: '2.5 MB',
        generatedAt: new Date(),
        expiresAt: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
      };

      logger.info('Activity logs exported', {
        exportId: export_data.exportId,
        format,
        totalRecords: export_data.totalRecords,
      });

      return export_data;
    } catch (error) {
      logger.error('Error exporting activity logs', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Clean up old activity logs
   * @param {number} retentionDays - Number of days to retain
   * @returns {Promise<Object>} - Cleanup result
   */
  static async cleanupOldActivityLogs(retentionDays = 90) {
    try {
      if (retentionDays < 30) {
        throw new Error('Retention period must be at least 30 days');
      }

      // In real implementation, delete old logs from database
      const result = {
        recordsDeleted: 5240,
        periodsDeleted: [
          { month: 'January', recordsDeleted: 2100 },
          { month: 'February', recordsDeleted: 1800 },
          { month: 'March', recordsDeleted: 1340 },
        ],
        freedSpace: '15.5 MB',
        retentionDays,
        cleanupDate: new Date(),
      };

      logger.warn('Old activity logs cleaned up', {
        recordsDeleted: result.recordsDeleted,
        retentionDays,
      });

      return result;
    } catch (error) {
      logger.error('Error cleaning up activity logs', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }
}

export default ActivityLogService;
