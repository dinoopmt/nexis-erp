/**
 * PrinterConfigurationService.js
 * Handles all printer configuration operations
 */
import PrinterConfiguration from '../../../Models/PrinterConfiguration.js';

class PrinterConfigurationService {
  /**
   * Get all active printer configurations
   * @param {string} companyId - Target company
   * @returns {Promise<Array>} Array of printer configs
   */
  async getAllConfigurations(companyId = null) {
    try {
      const query = { deleted: false, isActive: true };
      if (companyId) {
        query.companyId = companyId;
      }

      const configs = await PrinterConfiguration.find(query).sort({ createdDate: -1 });
      return configs;
    } catch (error) {
      throw new Error(`Failed to fetch printer configurations: ${error.message}`);
    }
  }

  /**
   * Get single printer configuration by ID
   * @param {string} configId - Configuration ID
   * @returns {Promise<Object>} Printer config
   */
  async getConfigurationById(configId) {
    try {
      const config = await PrinterConfiguration.findById(configId);
      if (!config || config.deleted) {
        throw new Error('Printer configuration not found');
      }
      return config;
    } catch (error) {
      throw new Error(`Failed to fetch configuration: ${error.message}`);
    }
  }

  /**
   * Create new printer configuration
   * @param {Object} configData - Configuration data
   * @returns {Promise<Object>} Created configuration
   */
  async createConfiguration(configData) {
    try {
      // Extract variables from template
      const variableRegex = /\{([A-Z_]+)\}/g;
      const variables = [];
      let match;
      while ((match = variableRegex.exec(configData.configTxt)) !== null) {
        if (!variables.includes(match[1])) {
          variables.push(match[1]);
        }
      }

      const newConfig = new PrinterConfiguration({
        ...configData,
        variables,
        createdBy: configData.createdBy || 'System',
      });

      const savedConfig = await newConfig.save();
      return savedConfig;
    } catch (error) {
      throw new Error(`Failed to create printer configuration: ${error.message}`);
    }
  }

  /**
   * Update existing printer configuration
   * @param {string} configId - Configuration ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated configuration
   */
  async updateConfiguration(configId, updateData) {
    try {
      // Recalculate variables if template changed
      if (updateData.configTxt) {
        const variableRegex = /\{([A-Z_]+)\}/g;
        const variables = [];
        let match;
        while ((match = variableRegex.exec(updateData.configTxt)) !== null) {
          if (!variables.includes(match[1])) {
            variables.push(match[1]);
          }
        }
        updateData.variables = variables;
      }

      const updatedConfig = await PrinterConfiguration.findByIdAndUpdate(
        configId,
        { ...updateData, updatedBy: updateData.updatedBy || 'System' },
        { new: true, runValidators: true }
      );

      if (!updatedConfig) {
        throw new Error('Printer configuration not found');
      }

      return updatedConfig;
    } catch (error) {
      throw new Error(`Failed to update printer configuration: ${error.message}`);
    }
  }

  /**
   * Delete (soft) printer configuration
   * @param {string} configId - Configuration ID
   * @returns {Promise<Boolean>} Success status
   */
  async deleteConfiguration(configId) {
    try {
      await PrinterConfiguration.findByIdAndUpdate(
        configId,
        { deleted: true, updatedBy: 'System' },
        { new: true }
      );
      return true;
    } catch (error) {
      throw new Error(`Failed to delete printer configuration: ${error.message}`);
    }
  }

  /**
   * Process template by replacing variables with actual values
   * @param {string} template - Template with {VARIABLE} placeholders
   * @param {Object} values - Object with variable values
   * @returns {string} Processed command
   */
  processTemplate(template, values) {
    let processedCommand = template;

    Object.keys(values).forEach((key) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      processedCommand = processedCommand.replace(regex, values[key] || '');
    });

    return processedCommand;
  }

  /**
   * Prepare print command for a product
   * @param {string} configId - Configuration ID
   * @param {Object} product - Product data
   * @param {number} quantity - Label quantity
   * @returns {Promise<string>} Ready-to-print command
   */
  async preparePrintCommand(configId, product, quantity = 1) {
    try {
      const config = await this.getConfigurationById(configId);

      // Prepare variable values from product
      const values = {
        ITEM_NAME: product.name || '',
        BARCODE: product.barcode || product.itemcode || '',
        DECIMAL_ITEM_PRICE: String((product.price || 0).toString().split('.')[1] || '00'),
        NUMBER_ITEM_PRICE: String(Math.floor(product.price || 0)),
        DECIMAL_ITEM_PRICE_AFTER_TAX: String((product.priceAfterTax || product.price || 0).toString().split('.')[1] || '00'),
        NUMBER_ITEM_PRICE_AFTER_TAX: String(Math.floor(product.priceAfterTax || product.price || 0)),
        LABEL_QUANTITY: String(quantity),
      };

      // Process template
      const processedCommand = this.processTemplate(config.configTxt, values);

      return processedCommand;
    } catch (error) {
      throw new Error(`Failed to prepare print command: ${error.message}`);
    }
  }
}

export default new PrinterConfigurationService();
