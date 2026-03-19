import StoreSettings from '../../../Models/StoreSettings.js';
import logger from '../../../config/logger.js';

class StoreSettingsService {
  /**
   * Get store settings
   */
  async getStoreSettings() {
    try {
      let settings = await StoreSettings.findOne();

      if (!settings) {
        // Create default store settings if not exists
        settings = new StoreSettings({
          storeName: 'Default Store',
          storeCode: 'STR001',
          terminalSettings: [
            {
              terminalId: 'TRM001',
              terminalName: 'Terminal 1',
              invoiceNumberPrefix: 'T1',
              invoiceFormat: 'STANDARD',
              enableCreditSale: true,
              enableReturns: true,
              enablePromotions: true,
            },
          ],
        });
        await settings.save();
      }

      return settings;
    } catch (error) {
      logger.error('Error fetching store settings:', error);
      throw error;
    }
  }

  /**
   * Update store settings
   */
  async updateStoreSettings(storeData) {
    try {
      let settings = await StoreSettings.findOne();

      if (!settings) {
        settings = new StoreSettings(storeData);
      } else {
        Object.assign(settings, storeData);
      }

      settings.updatedAt = new Date();
      await settings.save();

      logger.info('Store settings updated successfully');

      return settings;
    } catch (error) {
      logger.error('Error updating store settings:', error);
      throw error;
    }
  }

  /**
   * Get terminal configuration
   */
  async getTerminalSettings(terminalId) {
    try {
      const settings = await StoreSettings.findOne();

      if (!settings) {
        const error = new Error('Store settings not found');
        error.status = 404;
        throw error;
      }

      const terminal = settings.terminalSettings.find(
        (t) => t.terminalId === terminalId
      );

      if (!terminal) {
        const error = new Error('Terminal not found');
        error.status = 404;
        throw error;
      }

      return terminal;
    } catch (error) {
      logger.error('Error fetching terminal settings:', error);
      throw error;
    }
  }

  /**
   * Update terminal configuration
   */
  async updateTerminalSettings(terminalId, terminalData) {
    try {
      const settings = await StoreSettings.findOne();

      if (!settings) {
        const error = new Error('Store settings not found');
        error.status = 404;
        throw error;
      }

      const terminalIndex = settings.terminalSettings.findIndex(
        (t) => t.terminalId === terminalId
      );

      if (terminalIndex === -1) {
        const error = new Error('Terminal not found');
        error.status = 404;
        throw error;
      }

      settings.terminalSettings[terminalIndex] = {
        ...settings.terminalSettings[terminalIndex],
        ...terminalData,
      };

      settings.updatedAt = new Date();
      await settings.save();

      logger.info('Terminal settings updated successfully', { terminalId });

      return settings.terminalSettings[terminalIndex];
    } catch (error) {
      logger.error('Error updating terminal settings:', error);
      throw error;
    }
  }

  /**
   * Get store control settings
   */
  async getStoreControlSettings() {
    try {
      const settings = await StoreSettings.findOne();

      if (!settings) {
        const error = new Error('Store settings not found');
        error.status = 404;
        throw error;
      }

      return settings.storeControlSettings;
    } catch (error) {
      logger.error('Error fetching store control settings:', error);
      throw error;
    }
  }

  /**
   * Check if a feature is enabled
   */
  async isFeatureEnabled(featureName) {
    try {
      const settings = await StoreSettings.findOne();

      if (!settings) {
        return false;
      }

      const { storeControlSettings } = settings;

      const featureMap = {
        INVENTORY_TRACKING: storeControlSettings.enableInventoryTracking,
        STOCK_ALERTS: storeControlSettings.enableStockAlerts,
        CREDIT_LIMIT: storeControlSettings.enableCreditLimit,
        DISCOUNTS: storeControlSettings.enableDiscounts,
        RETURNS: storeControlSettings.enableReturns,
        PRICE_OVERRIDE: storeControlSettings.enablePriceOverride,
        MANAGER_APPROVAL: storeControlSettings.enableManagerApproval,
      };

      return featureMap[featureName] || false;
    } catch (error) {
      logger.error('Error checking feature status:', error);
      throw error;
    }
  }

  /**
   * Get printer configuration
   */
  async getPrinterConfiguration() {
    try {
      const settings = await StoreSettings.findOne();

      if (!settings) {
        const error = new Error('Store settings not found');
        error.status = 404;
        throw error;
      }

      return {
        printerModel: settings.printerModel,
        printerPort: settings.printerPort,
        labelWidth: settings.labelWidth,
        labelHeight: settings.labelHeight,
      };
    } catch (error) {
      logger.error('Error fetching printer configuration:', error);
      throw error;
    }
  }

  /**
   * Get barcode configuration
   */
  async getBarcodeConfiguration() {
    try {
      const settings = await StoreSettings.findOne();

      if (!settings) {
        const error = new Error('Store settings not found');
        error.status = 404;
        throw error;
      }

      return {
        barcodePrefix: settings.barcodePrefix,
        barcodeFormat: settings.barcodeFormat,
      };
    } catch (error) {
      logger.error('Error fetching barcode configuration:', error);
      throw error;
    }
  }
}

export default new StoreSettingsService();
