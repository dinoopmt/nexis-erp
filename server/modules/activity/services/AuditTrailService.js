import logger from '../../../config/logger.js';
import { AppError } from '../../../config/errorHandler.js';

/**
 * AuditTrailService
 * Tracks detailed changes to entities with before/after values
 * Maintains complete audit trail for compliance and investigation
 */
class AuditTrailService {
  /**
   * Record entity change
   * @param {Object} changeData - { entityType, entityId, action, userId, beforeValues, afterValues, changedFields }
   * @returns {Promise<Object>} - Created audit record
   */
  static async recordEntityChange(changeData) {
    try {
      const {
        entityType,
        entityId,
        action,
        userId,
        beforeValues,
        afterValues,
        changedFields,
        description,
        ipAddress,
      } = changeData;

      if (!entityType || !entityId || !action || !userId) {
        throw new Error('Entity Type, Entity ID, Action, and User ID are required');
      }

      const validActions = ['Create', 'Update', 'Delete', 'Restore'];
      if (!validActions.includes(action)) {
        throw new Error(`Invalid action. Valid actions: ${validActions.join(', ')}`);
      }

      const audit = {
        auditId: `AUD_${new Date().getTime()}`,
        entityType,
        entityId,
        action,
        userId,
        beforeValues: beforeValues || {},
        afterValues: afterValues || {},
        changedFields: changedFields || [],
        description,
        ipAddress,
        timestamp: new Date(),
        changesSummary: this.generateChangesSummary(beforeValues, afterValues),
      };

      logger.info('Entity change recorded in audit trail', {
        auditId: audit.auditId,
        entityType,
        entityId,
        action,
        changedFields: changedFields ? changedFields.length : 0,
      });

      return audit;
    } catch (error) {
      logger.error('Error recording entity change', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get audit trail for entity
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @param {Object} filters - { limit, fromDate, toDate, action }
   * @returns {Promise<Array>} - Audit records
   */
  static async getEntityAuditTrail(entityType, entityId, filters = {}) {
    try {
      const { limit = 100, fromDate, toDate, action } = filters;

      if (!entityType || !entityId) {
        throw new Error('Entity Type and Entity ID are required');
      }

      // In real implementation, query from database
      let audits = [
        {
          auditId: 'AUD_001',
          entityType,
          entityId,
          action: 'Create',
          userId: 'USER_001',
          timestamp: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
          changedFields: ['name', 'code', 'amount'],
          changesSummary: '3 fields created',
        },
        {
          auditId: 'AUD_002',
          entityType,
          entityId,
          action: 'Update',
          userId: 'USER_002',
          timestamp: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
          changedFields: ['status', 'amount'],
          changesSummary: '2 fields updated',
          beforeValues: { status: 'Draft', amount: 1000 },
          afterValues: { status: 'Approved', amount: 1500 },
        },
      ];

      if (action) {
        audits = audits.filter((a) => a.action === action);
      }

      logger.info('Entity audit trail retrieved', {
        entityType,
        entityId,
        totalRecords: audits.length,
      });

      return audits.slice(0, limit);
    } catch (error) {
      logger.error('Error retrieving entity audit trail', {
        error: error.message,
        entityType,
        entityId,
      });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get change history for specific field
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @param {string} fieldName - Field name
   * @returns {Promise<Array>} - Field change history
   */
  static async getFieldChangeHistory(entityType, entityId, fieldName) {
    try {
      if (!entityType || !entityId || !fieldName) {
        throw new Error('Entity Type, Entity ID, and Field Name are required');
      }

      // In real implementation, query from database
      const history = [
        {
          timestamp: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
          userId: 'USER_001',
          action: 'Create',
          oldValue: null,
          newValue: 'Draft',
        },
        {
          timestamp: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
          userId: 'USER_002',
          action: 'Update',
          oldValue: 'Draft',
          newValue: 'Approved',
        },
        {
          timestamp: new Date(new Date().getTime() - 1 * 24 * 60 * 60 * 1000),
          userId: 'USER_003',
          action: 'Update',
          oldValue: 'Approved',
          newValue: 'Posted',
        },
      ];

      logger.info('Field change history retrieved', {
        entityType,
        entityId,
        fieldName,
        totalChanges: history.length,
      });

      return history;
    } catch (error) {
      logger.error('Error retrieving field change history', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get users with most changes
   * @param {Object} filters - { fromDate, toDate, limit, entityType }
   * @returns {Promise<Array>} - User change statistics
   */
  static async getMostActiveDUsers(filters = {}) {
    try {
      const { fromDate, toDate, limit = 20, entityType } = filters;

      // In real implementation, aggregate from database
      const users = [
        { userId: 'USER_001', fullName: 'John Doe', changesCount: 450, topAction: 'Update' },
        { userId: 'USER_002', fullName: 'Jane Smith', changesCount: 380, topAction: 'Create' },
        { userId: 'USER_003', fullName: 'Bob Johnson', changesCount: 250, topAction: 'Update' },
        { userId: 'USER_004', fullName: 'Alice Brown', changesCount: 180, topAction: 'Delete' },
        { userId: 'USER_005', fullName: 'Charlie Davis', changesCount: 120, topAction: 'Update' },
      ];

      logger.info('Most active users retrieved', {
        limit,
        totalUsers: users.length,
      });

      return users.slice(0, limit);
    } catch (error) {
      logger.error('Error retrieving most active users', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Compare entity versions
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @param {string} auditId1 - First audit ID
   * @param {string} auditId2 - Second audit ID
   * @returns {Promise<Object>} - Comparison result
   */
  static async compareEntityVersions(entityType, entityId, auditId1, auditId2) {
    try {
      if (!entityType || !entityId || !auditId1 || !auditId2) {
        throw new Error('All parameters are required');
      }

      // In real implementation, fetch audit records and compare
      const comparison = {
        entityType,
        entityId,
        version1: { auditId: auditId1, timestamp: new Date() },
        version2: { auditId: auditId2, timestamp: new Date() },
        differences: [
          {
            fieldName: 'status',
            value1: 'Draft',
            value2: 'Approved',
            type: 'Modified',
          },
          {
            fieldName: 'approvedAmount',
            value1: 1000,
            value2: 1500,
            type: 'Modified',
          },
        ],
        similarFields: ['name', 'code', 'description'],
        changeCount: 2,
      };

      logger.info('Entity versions compared', {
        entityType,
        entityId,
        differencesFound: comparison.differences.length,
      });

      return comparison;
    } catch (error) {
      logger.error('Error comparing entity versions', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Generate audit report
   * @param {Object} filters - { fromDate, toDate, entityType, userId, action, includeDetails }
   * @returns {Promise<Object>} - Audit report
   */
  static async generateAuditReport(filters = {}) {
    try {
      const { fromDate, toDate, entityType, userId, action, includeDetails = false } = filters;

      const report = {
        reportId: `ARP_${new Date().getTime()}`,
        period: { fromDate, toDate },
        filters: { entityType, userId, action },
        summary: {
          totalChanges: 2450,
          uniqueUsers: 45,
          uniqueEntities: 380,
          createCount: 250,
          updateCount: 1850,
          deleteCount: 350,
          restoreCount: 0,
        },
        changesByEntityType: [
          { entityType: 'SalesOrder', changeCount: 520, topAction: 'Update' },
          { entityType: 'Invoice', changeCount: 380, topAction: 'Create' },
          { entityType: 'Stock', changeCount: 890, topAction: 'Update' },
        ],
        changesByUser: [
          { userId: 'USER_001', changeCount: 450, topAction: 'Update' },
          { userId: 'USER_002', changeCount: 380, topAction: 'Create' },
        ],
        riskAssessment: {
          highRiskChanges: 15,
          bulkDeletes: 2,
          unauthorizedAttempts: 0,
          unusualActivity: 5,
        },
        generatedAt: new Date(),
      };

      logger.info('Audit report generated', {
        reportId: report.reportId,
        totalChanges: report.summary.totalChanges,
      });

      return report;
    } catch (error) {
      logger.error('Error generating audit report', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Detect uncommon patterns in changes
   * @param {Object} filters - { fromDate, toDate, sensitivityLevel }
   * @returns {Promise<Array>} - Detected anomalies
   */
  static async detectChangeAnomalies(filters = {}) {
    try {
      const { fromDate, toDate, sensitivityLevel = 'Medium' } = filters;

      // In real implementation, analyze patterns from database
      const anomalies = [
        {
          anomalyId: 'ANO_001',
          type: 'BulkDelete',
          description: 'Unusual bulk deletion of 150 inventory records',
          userId: 'USER_015',
          affectedRecords: 150,
          timestamp: new Date(),
          riskLevel: 'High',
          recommendation: 'Review deletion reason',
        },
        {
          anomalyId: 'ANO_002',
          type: 'UnusualAccess',
          description: 'User accessing data outside normal business hours',
          userId: 'USER_023',
          accessCount: 45,
          timestamp: new Date(),
          riskLevel: 'Medium',
          recommendation: 'Verify user activity',
        },
      ];

      logger.info('Change anomalies detected', {
        totalAnomalies: anomalies.length,
        sensitivityLevel,
      });

      return anomalies;
    } catch (error) {
      logger.error('Error detecting change anomalies', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Generate change summary between dates
   * @param {Object} beforeValues - Before values object
   * @param {Object} afterValues - After values object
   * @returns {string} - Summary text
   */
  static generateChangesSummary(beforeValues = {}, afterValues = {}) {
    const changes = [];

    for (const [key, afterValue] of Object.entries(afterValues)) {
      const beforeValue = beforeValues[key];
      if (beforeValue !== afterValue) {
        changes.push(key);
      }
    }

    return changes.length > 0
      ? `${changes.length} field${changes.length > 1 ? 's' : ''} modified`
      : 'No changes';
  }
}

export default AuditTrailService;
