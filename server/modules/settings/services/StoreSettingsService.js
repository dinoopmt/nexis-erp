import StoreSettings from '../../../Models/StoreSettings.js';
import logger from '../../../config/logger.js';
import { EventEmitter } from 'events';

// ✅ GLOBAL EVENT EMITTER: Broadcast settings changes to all connected clients
export const settingsEventEmitter = new EventEmitter();

class StoreSettingsService extends EventEmitter {
  constructor() {
    super();
    // ✅ IN-MEMORY CACHE: Store naming rules with TTL to avoid DB queries on every product creation
    this.namingRulesCache = null;
    this.namingRulesCacheTime = null;
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  }

  /**
   * Check if cache is still valid
   */
  isCacheValid() {
    if (!this.namingRulesCache || !this.namingRulesCacheTime) {
      return false;
    }
    const now = Date.now();
    const isValid = now - this.namingRulesCacheTime < this.CACHE_TTL;
    if (!isValid) {
      logger.debug('✅ Naming rules cache expired, will refresh from DB');
    }
    return isValid;
  }

  /**
   * Invalidate naming rules cache (call after update)
   */
  invalidateNamingRulesCache() {
    this.namingRulesCache = null;
    this.namingRulesCacheTime = null;
    logger.info('✅ Naming rules cache invalidated');
  }

  /**
   * Force refresh: Fetch fresh data from DB (used on user login)
   * Bypasses cache completely
   */
  async forceRefreshNamingRules() {
    try {
      logger.info('🔄 Force refresh naming rules (user login detected)');
      this.invalidateNamingRulesCache();
      // Next call will fetch from DB
      return await this.getNamingRules();
    } catch (error) {
      logger.error('Error force refreshing naming rules:', error);
      throw error;
    }
  }

  /**
   * Get store settings
   */
  async getStoreSettings() {
    try {
      let settings = await StoreSettings.findOne();
      console.log('📤 getStoreSettings - retrieved templateMappings:', JSON.stringify(settings?.templateMappings, null, 2));

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
        console.log('📤 Created default settings with templateMappings:', JSON.stringify(settings?.templateMappings, null, 2));
      }

      console.log('📤 Returning settings with templateMappings:', JSON.stringify(settings.templateMappings, null, 2));
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
      console.log('📝 updateStoreSettings called with storeData keys:', Object.keys(storeData));
      console.log('📝 Input storeData.templateMappings:', JSON.stringify(storeData?.templateMappings, null, 2));
      
      let settings = await StoreSettings.findOne();
      console.log('🔍 Fetched existing settings, has templateMappings:', !!settings?.templateMappings);

      if (!settings) {
        console.log('✨ Creating new StoreSettings');
        settings = new StoreSettings(storeData);
      } else {
        // ✅ Explicitly set each field to avoid Mongoose nested object issues
        settings.storeName = storeData.storeName || settings.storeName;
        settings.storeCode = storeData.storeCode || settings.storeCode;
        settings.address1 = storeData.address1 || settings.address1;
        settings.address2 = storeData.address2 || settings.address2;
        settings.phone = storeData.phone || settings.phone;
        settings.email = storeData.email || settings.email;
        settings.taxNumber = storeData.taxNumber || settings.taxNumber;
        settings.logoUrl = storeData.logoUrl || settings.logoUrl;
        
        // Merge nested objects
        if (storeData.salesControls) {
          settings.salesControls = { ...settings.salesControls, ...storeData.salesControls };
        }
        if (storeData.storeControlSettings) {
          settings.storeControlSettings = { ...settings.storeControlSettings, ...storeData.storeControlSettings };
        }
        if (storeData.weightScaleSettings) {
          settings.weightScaleSettings = { ...settings.weightScaleSettings, ...storeData.weightScaleSettings };
        }
        
        // 🔴 CRITICAL FIX: Completely rebuild templateMappings from incoming data
        // Mongoose nested objects can be tricky - rebuild from scratch instead of merge
        if (storeData.templateMappings) {
          console.log('📥 Backend received templateMappings:', JSON.stringify(storeData.templateMappings, null, 2));
          
          settings.templateMappings = {
            lpo: {
              templateId: storeData.templateMappings?.lpo?.templateId || null
            },
            grn: {
              templateId: storeData.templateMappings?.grn?.templateId || null
            },
            rtv: {
              templateId: storeData.templateMappings?.rtv?.templateId || null
            }
          };
          
          // 🚩 FIX: Mark templateMappings as modified
          settings.markModified('templateMappings');
          
          console.log('💾 Backend storing templateMappings:', JSON.stringify(settings.templateMappings, null, 2));
          console.log('✅ Marked templateMappings as modified');
        } else {
          console.log('⚠️  No templateMappings in storeData!');
        }
      }

      settings.updatedAt = new Date();
      console.log('💾 Before save - settings.templateMappings:', JSON.stringify(settings.templateMappings, null, 2));
      
      const savedSettings = await settings.save();
      
      console.log('✅ After save - settings.templateMappings:', JSON.stringify(savedSettings.templateMappings, null, 2));

      logger.info('Store settings updated successfully');
      
      // ✅ Return fresh read from database to confirm persistence
      const freshSettings = await StoreSettings.findOne();
      console.log('🔄 Fresh read from DB - templateMappings:', JSON.stringify(freshSettings.templateMappings, null, 2));

      return freshSettings;
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

  /**
   * Get product naming rules (with in-memory caching)
   */
  async getNamingRules() {
    try {
      // ✅ CACHE CHECK: Return cached rules if still valid (avoids DB query)
      if (this.isCacheValid()) {
        logger.debug('✅ Returning naming rules from cache (TTL: 5min)');
        return this.namingRulesCache;
      }

      // Cache miss or expired - fetch from DB
      let settings = await StoreSettings.findOne();

      if (!settings) {
        // Create default store settings if not exists
        settings = new StoreSettings({
          storeName: 'Default Store',
          storeCode: 'STR001',
        });
        await settings.save();
      }

      const rules = settings.productNamingRules || {
        enabled: true,
        convention: 'FREE',
        preventLowercase: false,
        preventAllCaps: false,
        enforceOnSave: true,
        checkDuplicates: true,
      };

      // ✅ CACHE UPDATE: Store in memory with timestamp
      this.namingRulesCache = rules;
      this.namingRulesCacheTime = Date.now();
      logger.debug('✅ Naming rules cached (valid for 5 minutes)');

      return rules;
    } catch (error) {
      logger.error('Error fetching product naming rules:', error);
      throw error;
    }
  }

  /**
   * Update product naming rules (invalidates cache + broadcasts change)
   */
  async updateNamingRules(rulesData) {
    try {
      let settings = await StoreSettings.findOne();

      if (!settings) {
        settings = new StoreSettings({
          storeName: 'Default Store',
          storeCode: 'STR001',
          productNamingRules: rulesData,
        });
      } else {
        settings.productNamingRules = {
          ...settings.productNamingRules,
          ...rulesData,
        };
      }

      settings.updatedAt = new Date();
      await settings.save();

      // ✅ CACHE INVALIDATION: Clear cache so next request fetches updated rules
      this.invalidateNamingRulesCache();

      logger.info('Product naming rules updated successfully');

      // ✅ BROADCAST: Notify all connected clients about settings change
      settingsEventEmitter.emit('naming-rules-updated', {
        timestamp: new Date(),
        rules: settings.productNamingRules,
        message: '✅ Naming rules updated by admin'
      });
      logger.info('🔔 Broadcasting naming rules update to all connected clients');

      return settings.productNamingRules;
    } catch (error) {
      logger.error('Error updating product naming rules:', error);
      throw error;
    }
  }
}

export default new StoreSettingsService();
