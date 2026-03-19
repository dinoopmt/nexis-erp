import logger from '../../../config/logger.js';
import { AppError } from '../../../config/errorHandler.js';

/**
 * SystemSettingsService
 * Manages global system configuration and settings
 * Handles company info, business rules, and operational parameters
 */
class SystemSettingsService {
  /**
   * Get system settings
   * @param {Object} filters - { category, includeSecure }
   * @returns {Promise<Object>} - System settings by category
   */
  static async getSystemSettings(filters = {}) {
    try {
      const { category, includeSecure = false } = filters;

      // In real implementation, fetch from database
      const settings = {
        company: {
          name: 'NEXIS-ERP Corporation',
          registrationNumber: 'REG_12345',
          taxId: 'TAX_98765',
          address: '123 Business Avenue',
          city: 'New York',
          country: 'United States',
          phone: '1-800-NEXIS-ERP',
          email: 'admin@nexis-erp.com',
          website: 'www.nexis-erp.com',
          logo_url: '/assets/logo.png',
          currency: 'USD',
          financialYearStart: '01-01',
          financialYearEnd: '12-31',
          timezone: 'America/New_York',
        },
        business: {
          defaultWarehouse: 'MAIN_WAREHOUSE',
          defaultCostCenter: 'GENERAL',
          defaultCustomerGroup: 'REGULAR',
          defaultVendorGroup: 'SUPPLIER',
          stockValuationMethod: 'FIFO',
          allowNegativeStock: false,
          allowBackorders: true,
          autoApprove: false,
          sequenceFormat: 'PREFIX{YYMMDD}{SEQ}',
        },
        accounting: {
          chartOfAccountsVersion: 'v1.0',
          allowMultipleCurrency: true,
          roundingMethod: 'Round',
          roundingPrecision: 2,
          enableTax: true,
          defaultTaxMethod: 'Inclusive',
          enableBudget: true,
          enableCostCenter: true,
          enableProject: false,
        },
        security: includeSecure
          ? {
              passwordMinLength: 8,
              passwordExpireDays: 90,
              sessionTimeoutMinutes: 30,
              maxLoginAttempts: 5,
              mfaEnabled: false,
              sslRequired: true,
              ipWhitelistEnabled: false,
            }
          : null,
      };

      logger.info('System settings retrieved', {
        category,
        includeSecure,
      });

      return settings;
    } catch (error) {
      logger.error('Error retrieving system settings', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Update system settings
   * @param {string} category - Settings category
   * @param {Object} settingsData - Settings to update
   * @returns {Promise<Object>} - Updated settings
   */
  static async updateSystemSettings(category, settingsData) {
    try {
      if (!category || !settingsData) {
        throw new Error('Category and settings data are required');
      }

      const validCategories = ['company', 'business', 'accounting', 'security', 'email', 'sms'];
      if (!validCategories.includes(category)) {
        throw new Error(`Invalid category. Valid categories: ${validCategories.join(', ')}`);
      }

      // In real implementation, validate and update in database
      const updated = {
        category,
        settings: settingsData,
        updatedAt: new Date(),
        updatedBy: 'SYSTEM',
        changeLog: [
          {
            setting: 'allowNegativeStock',
            oldValue: false,
            newValue: settingsData.allowNegativeStock,
            changedBy: 'SYSTEM',
            changedAt: new Date(),
          },
        ],
      };

      logger.info('System settings updated', {
        category,
        settingsCount: Object.keys(settingsData).length,
      });

      return updated;
    } catch (error) {
      logger.error('Error updating system settings', { error: error.message, category });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get company information
   * @returns {Promise<Object>} - Company details
   */
  static async getCompanyInfo() {
    try {
      // In real implementation, fetch from database
      const company = {
        companyId: 'COMPANY_001',
        name: 'NEXIS-ERP Corporation',
        registrationNumber: 'REG_12345',
        taxId: 'TAX_98765',
        address: '123 Business Avenue',
        city: 'New York',
        state: 'NY',
        country: 'United States',
        postalCode: '10001',
        phone: '1-800-NEXIS-ERP',
        fax: '1-800-NEXIS-FAX',
        email: 'admin@nexis-erp.com',
        website: 'www.nexis-erp.com',
        logo_url: '/assets/logo.png',
        currency: 'USD',
        financialYearStart: '01-01',
        financialYearEnd: '12-31',
        timezone: 'America/New_York',
        locale: 'en_US',
        legalStructure: 'Corporation',
        establishedDate: new Date('2015-01-01'),
      };

      logger.info('Company information retrieved', {
        companyId: company.companyId,
        name: company.name,
      });

      return company;
    } catch (error) {
      logger.error('Error retrieving company information', { error: error.message });
      const err = new Error(error.message);
      err.status = 404;
      throw err;
    }
  }

  /**
   * Update company information
   * @param {Object} companyData - Company data to update
   * @returns {Promise<Object>} - Updated company info
   */
  static async updateCompanyInfo(companyData) {
    try {
      if (!companyData || Object.keys(companyData).length === 0) {
        throw new Error('Company data is required');
      }

      // In real implementation, update in database
      const updated = {
        companyId: 'COMPANY_001',
        ...companyData,
        updatedAt: new Date(),
        updatedBy: 'USER_ADMIN',
      };

      logger.info('Company information updated', {
        companyId: 'COMPANY_001',
        fieldsUpdated: Object.keys(companyData).length,
      });

      return updated;
    } catch (error) {
      logger.error('Error updating company information', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get module configuration
   * @param {string} moduleName - Module name
   * @returns {Promise<Object>} - Module configuration
   */
  static async getModuleConfiguration(moduleName) {
    try {
      if (!moduleName) {
        throw new Error('Module name is required');
      }

      // In real implementation, fetch from database
      const config = {
        moduleName,
        enabled: true,
        version: '1.0',
        settings: {
          Sales: {
            enableCommission: true,
            commissionCalculationType: 'Percentage',
            enableDiscounts: true,
            requirePOforOrder: false,
            autoInvoice: true,
          },
          Inventory: {
            enableBatches: true,
            requireSerialNumbers: false,
            enableMultipleUOM: true,
            stockValuation: 'FIFO',
            autoReorder: true,
          },
          Accounting: {
            enableMultipleCurrency: true,
            enableTaxation: true,
            enableBudget: true,
            enableCostCenter: true,
            bankReconciliation: 'Monthly',
          },
          Purchasing: {
            requireRFQ: false,
            autoApprove: false,
            minPOAmount: 1000,
            enableGRN: true,
          },
        },
      };

      logger.info('Module configuration retrieved', {
        moduleName,
        enabled: config.enabled,
      });

      return config;
    } catch (error) {
      logger.error('Error retrieving module configuration', {
        error: error.message,
        moduleName,
      });
      const err = new Error(error.message);
      err.status = 404;
      throw err;
    }
  }

  /**
   * Update module configuration
   * @param {string} moduleName - Module name
   * @param {Object} configData - Configuration data
   * @returns {Promise<Object>} - Updated configuration
   */
  static async updateModuleConfiguration(moduleName, configData) {
    try {
      if (!moduleName || !configData) {
        throw new Error('Module name and configuration are required');
      }

      // In real implementation, update in database
      const updated = {
        moduleName,
        settings: configData,
        updatedAt: new Date(),
        updatedBy: 'USER_ADMIN',
      };

      logger.info('Module configuration updated', {
        moduleName,
        settingsCount: Object.keys(configData).length,
      });

      return updated;
    } catch (error) {
      logger.error('Error updating module configuration', {
        error: error.message,
        moduleName,
      });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get system health/status
   * @returns {Promise<Object>} - System health status
   */
  static async getSystemHealth() {
    try {
      // In real implementation, check actual system metrics
      const health = {
        status: 'Healthy',
        timestamp: new Date(),
        uptime: 45000000,
        database: {
          status: 'Connected',
          responseTime: 15,
          connections: 25,
          maxConnections: 100,
        },
        cache: {
          status: 'Active',
          memory: '450 MB',
          hitRate: 92.5,
        },
        api: {
          status: 'Operational',
          requestsPerSecond: 125,
          avgResponseTime: 45,
          errorRate: 0.2,
        },
        storage: {
          used: '45 GB',
          total: '500 GB',
          percentUsed: 9,
        },
      };

      logger.info('System health retrieved', {
        status: health.status,
      });

      return health;
    } catch (error) {
      logger.error('Error retrieving system health', { error: error.message });
      const err = new Error(error.message);
      err.status = 500;
      throw err;
    }
  }

  /**
   * Get system audit log
   * @param {Object} filters - { limit, fromDate, toDate, action }
   * @returns {Promise<Array>} - Audit log entries
   */
  static async getSystemAuditLog(filters = {}) {
    try {
      const { limit = 100, fromDate, toDate, action } = filters;

      // In real implementation, query from database
      const logs = [
        {
          logId: 'LOG_001',
          action: 'UpdateSetting',
          setting: 'allowNegativeStock',
          oldValue: false,
          newValue: true,
          changedBy: 'USER_ADMIN',
          timestamp: new Date(),
        },
        {
          logId: 'LOG_002',
          action: 'UpdateCompanyInfo',
          setting: 'phone',
          oldValue: '1-800-OLD-NUM',
          newValue: '1-800-NEXIS-ERP',
          changedBy: 'USER_ADMIN',
          timestamp: new Date(new Date().getTime() - 86400000),
        },
      ];

      logger.info('System audit log retrieved', {
        totalLogs: logs.length,
      });

      return logs.slice(0, limit);
    } catch (error) {
      logger.error('Error retrieving system audit log', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Backup system configuration
   * @returns {Promise<Object>} - Backup metadata
   */
  static async backupSystemConfiguration() {
    try {
      // In real implementation, create backup file
      const backup = {
        backupId: `BACKUP_${new Date().getTime()}`,
        backupDate: new Date(),
        backupSize: '2.5 MB',
        itemsBackedUp: 245,
        backupLocation: 's3://nexis-backups/config/backup_20240304.zip',
        encryptionStatus: 'Encrypted',
        expiresAt: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000),
      };

      logger.info('System configuration backed up', {
        backupId: backup.backupId,
        itemsBackedUp: backup.itemsBackedUp,
      });

      return backup;
    } catch (error) {
      logger.error('Error backing up system configuration', { error: error.message });
      const err = new Error(error.message);
      err.status = 500;
      throw err;
    }
  }
}

export default SystemSettingsService;
