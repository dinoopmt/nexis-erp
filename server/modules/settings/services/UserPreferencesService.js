import logger from '../../../config/logger.js';
import { AppError } from '../../../config/errorHandler.js';

/**
 * UserPreferencesService
 * Manages user-specific preferences and settings
 * Handles themes, language, default values, and UI preferences
 */
class UserPreferencesService {
  /**
   * Get user preferences
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - User preferences
   */
  static async getUserPreferences(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // In real implementation, fetch from database
      const preferences = {
        userId,
        theme: 'Light',
        language: 'en',
        timezone: 'America/New_York',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        currency: 'USD',
        decimalSeparator: '.',
        thousandSeparator: ',',
        defaultModule: 'Dashboard',
        defaultWarehouse: 'MAIN_WAREHOUSE',
        defaultCostCenter: 'GENERAL',
        rowsPerPage: 25,
        autoRefresh: true,
        autoRefreshInterval: 60,
        enableNotifications: true,
        enableSoundAlerts: false,
        enableEmailAlerts: true,
        printFormat: 'A4',
        printMargins: { top: 10, bottom: 10, left: 10, right: 10 },
        ui: {
          compactMode: false,
          showSidebar: true,
          sidebarPosition: 'left',
          showBreadcrumb: true,
          animationsEnabled: true,
          tooltipsEnabled: true,
        },
        dashboard: {
          cards: [
            { cardId: 'CARD_SALES', position: 1, visible: true },
            { cardId: 'CARD_INVENTORY', position: 2, visible: true },
            { cardId: 'CARD_RECEIVABLES', position: 3, visible: false },
          ],
          refreshInterval: 300,
        },
        createdAt: new Date(new Date().getTime() - 365 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      };

      logger.info('User preferences retrieved', {
        userId,
        theme: preferences.theme,
        language: preferences.language,
      });

      return preferences;
    } catch (error) {
      logger.error('Error retrieving user preferences', { error: error.message, userId });
      const err = new Error(error.message);
      err.status = 404;
      throw err;
    }
  }

  /**
   * Update user preferences
   * @param {string} userId - User ID
   * @param {Object} preferences - Preferences to update
   * @returns {Promise<Object>} - Updated preferences
   */
  static async updateUserPreferences(userId, preferences) {
    try {
      if (!userId || !preferences) {
        throw new Error('User ID and preferences are required');
      }

      // Validate theme
      const validThemes = ['Light', 'Dark', 'Auto'];
      if (preferences.theme && !validThemes.includes(preferences.theme)) {
        throw new Error(`Invalid theme. Valid themes: ${validThemes.join(', ')}`);
      }

      // In real implementation, update in database
      const updated = {
        userId,
        ...preferences,
        updatedAt: new Date(),
        updatedBy: userId,
      };

      logger.info('User preferences updated', {
        userId,
        fieldsUpdated: Object.keys(preferences).length,
      });

      return updated;
    } catch (error) {
      logger.error('Error updating user preferences', { error: error.message, userId });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Set user theme
   * @param {string} userId - User ID
   * @param {string} theme - Theme name (Light, Dark, Auto)
   * @returns {Promise<Object>} - Updated theme preference
   */
  static async setUserTheme(userId, theme) {
    try {
      if (!userId || !theme) {
        throw new Error('User ID and theme are required');
      }

      const validThemes = ['Light', 'Dark', 'Auto'];
      if (!validThemes.includes(theme)) {
        throw new Error(`Invalid theme. Valid themes: ${validThemes.join(', ')}`);
      }

      // In real implementation, update in database
      const updated = {
        userId,
        theme,
        updatedAt: new Date(),
      };

      logger.info('User theme set', {
        userId,
        theme,
      });

      return updated;
    } catch (error) {
      logger.error('Error setting user theme', { error: error.message, userId });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Set user language
   * @param {string} userId - User ID
   * @param {string} language - Language code (en, es, fr, de, etc)
   * @returns {Promise<Object>} - Updated language preference
   */
  static async setUserLanguage(userId, language) {
    try {
      if (!userId || !language) {
        throw new Error('User ID and language are required');
      }

      const supportedLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja'];
      if (!supportedLanguages.includes(language)) {
        throw new Error(`Unsupported language. Supported: ${supportedLanguages.join(', ')}`);
      }

      // In real implementation, update in database
      const updated = {
        userId,
        language,
        updatedAt: new Date(),
      };

      logger.info('User language set', {
        userId,
        language,
      });

      return updated;
    } catch (error) {
      logger.error('Error setting user language', { error: error.message, userId });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Set user timezone
   * @param {string} userId - User ID
   * @param {string} timezone - Timezone (e.g., America/New_York)
   * @returns {Promise<Object>} - Updated timezone preference
   */
  static async setUserTimezone(userId, timezone) {
    try {
      if (!userId || !timezone) {
        throw new Error('User ID and timezone are required');
      }

      // In real implementation, validate against IANA timezone database
      // In real implementation, update in database
      const updated = {
        userId,
        timezone,
        updatedAt: new Date(),
      };

      logger.info('User timezone set', {
        userId,
        timezone,
      });

      return updated;
    } catch (error) {
      logger.error('Error setting user timezone', { error: error.message, userId });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Set user defaults
   * @param {string} userId - User ID
   * @param {Object} defaults - Default values { defaultModule, defaultWarehouse, defaultCostCenter }
   * @returns {Promise<Object>} - Updated defaults
   */
  static async setUserDefaults(userId, defaults) {
    try {
      if (!userId || !defaults) {
        throw new Error('User ID and defaults are required');
      }

      // In real implementation, validate and update in database
      const updated = {
        userId,
        defaults,
        updatedAt: new Date(),
      };

      logger.info('User defaults set', {
        userId,
        defaultsCount: Object.keys(defaults).length,
      });

      return updated;
    } catch (error) {
      logger.error('Error setting user defaults', { error: error.message, userId });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Configure dashboard
   * @param {string} userId - User ID
   * @param {Array} cards - Dashboard cards configuration
   * @returns {Promise<Object>} - Updated dashboard configuration
   */
  static async configureDashboard(userId, cards) {
    try {
      if (!userId || !cards || !Array.isArray(cards)) {
        throw new Error('User ID and cards array are required');
      }

      // In real implementation, update in database
      const updated = {
        userId,
        dashboard: {
          cards: cards.map((card, index) => ({
            ...card,
            position: index + 1,
          })),
          configuredAt: new Date(),
        },
      };

      logger.info('Dashboard configured', {
        userId,
        cardsCount: cards.length,
      });

      return updated;
    } catch (error) {
      logger.error('Error configuring dashboard', { error: error.message, userId });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get user dashboard configuration
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Dashboard configuration
   */
  static async getUserDashboardConfig(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // In real implementation, fetch from database
      const dashboard = {
        userId,
        cards: [
          {
            cardId: 'CARD_SALES',
            name: 'Sales Overview',
            position: 1,
            visible: true,
            widgetSize: 'large',
            refreshInterval: 300,
          },
          {
            cardId: 'CARD_INVENTORY',
            name: 'Inventory Status',
            position: 2,
            visible: true,
            widgetSize: 'medium',
            refreshInterval: 600,
          },
          {
            cardId: 'CARD_RECEIVABLES',
            name: 'Receivables',
            position: 3,
            visible: false,
            widgetSize: 'medium',
          },
        ],
        layout: 'auto',
        configuredAt: new Date(),
      };

      logger.info('User dashboard configuration retrieved', {
        userId,
        cardsCount: dashboard.cards.length,
      });

      return dashboard;
    } catch (error) {
      logger.error('Error retrieving user dashboard configuration', {
        error: error.message,
        userId,
      });
      const err = new Error(error.message);
      err.status = 404;
      throw err;
    }
  }

  /**
   * Reset preferences to default
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Reset confirmation
   */
  static async resetPreferencesToDefault(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // In real implementation, reset in database
      const reset = {
        userId,
        status: 'Reset',
        resetAt: new Date(),
        resetTo: 'System defaults',
      };

      logger.info('User preferences reset to default', {
        userId,
      });

      return reset;
    } catch (error) {
      logger.error('Error resetting preferences', { error: error.message, userId });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }
}

export default UserPreferencesService;
