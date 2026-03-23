/**
 * printerConfigurationController.js
 * Handles HTTP requests for printer configurations
 */
import PrinterConfigurationService from '../services/PrinterConfigurationService.js';

/**
 * GET /api/v1/settings/printer-configurations
 * Fetch all active printer configurations
 */
export const getAllConfigurations = async (req, res) => {
  try {
    const { companyId } = req.query;
    const configs = await PrinterConfigurationService.getAllConfigurations(companyId);

    res.json({
      success: true,
      message: 'Printer configurations fetched successfully',
      data: configs,
      count: configs.length,
    });
  } catch (error) {
    console.error('Error fetching printer configurations:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch printer configurations',
    });
  }
};

/**
 * GET /api/v1/settings/printer-configurations/:id
 * Fetch single printer configuration
 */
export const getConfigurationById = async (req, res) => {
  try {
    const { id } = req.params;
    const config = await PrinterConfigurationService.getConfigurationById(id);

    res.json({
      success: true,
      message: 'Printer configuration fetched successfully',
      data: config,
    });
  } catch (error) {
    console.error('Error fetching printer configuration:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * POST /api/v1/settings/printer-configurations
 * Create new printer configuration
 */
export const createConfiguration = async (req, res) => {
  try {
    const { name, configTxt, legends, description, printerModel, labelWidth, labelHeight, companyId } =
      req.body;

    // Validate required fields
    if (!name || !configTxt || !legends) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, configTxt, legends',
      });
    }

    const newConfig = await PrinterConfigurationService.createConfiguration({
      name,
      configTxt,
      legends,
      description,
      printerModel,
      labelWidth,
      labelHeight,
      companyId,
      createdBy: req.user?.username || 'System',
    });

    res.status(201).json({
      success: true,
      message: 'Printer configuration created successfully',
      data: newConfig,
    });
  } catch (error) {
    console.error('Error creating printer configuration:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create printer configuration',
    });
  }
};

/**
 * PUT /api/v1/settings/printer-configurations/:id
 * Update printer configuration
 */
export const updateConfiguration = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedConfig = await PrinterConfigurationService.updateConfiguration(id, {
      ...updateData,
      updatedBy: req.user?.username || 'System',
    });

    res.json({
      success: true,
      message: 'Printer configuration updated successfully',
      data: updatedConfig,
    });
  } catch (error) {
    console.error('Error updating printer configuration:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update printer configuration',
    });
  }
};

/**
 * DELETE /api/v1/settings/printer-configurations/:id
 * Delete (soft) printer configuration
 */
export const deleteConfiguration = async (req, res) => {
  try {
    const { id } = req.params;
    await PrinterConfigurationService.deleteConfiguration(id);

    res.json({
      success: true,
      message: 'Printer configuration deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting printer configuration:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete printer configuration',
    });
  }
};

/**
 * POST /api/v1/settings/printer-configurations/:id/prepare-print
 * Prepare print command for a product
 */
export const preparePrintCommand = async (req, res) => {
  try {
    const { id } = req.params;
    const { product, quantity = 1 } = req.body;

    if (!product) {
      return res.status(400).json({
        success: false,
        message: 'Product data is required',
      });
    }

    const printCommand = await PrinterConfigurationService.preparePrintCommand(id, product, quantity);

    res.json({
      success: true,
      message: 'Print command prepared successfully',
      data: {
        command: printCommand,
        configId: id,
        productName: product.name,
        quantity,
      },
    });
  } catch (error) {
    console.error('Error preparing print command:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to prepare print command',
    });
  }
};

/**
 * POST /api/v1/settings/printer-configurations/process-template
 * Process template with custom values (for testing)
 */
export const processTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { values } = req.body;

    if (!values || typeof values !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Values object is required',
      });
    }

    const config = await PrinterConfigurationService.getConfigurationById(id);
    const processedCommand = PrinterConfigurationService.processTemplate(config.configTxt, values);

    res.json({
      success: true,
      message: 'Template processed successfully',
      data: {
        command: processedCommand,
      },
    });
  } catch (error) {
    console.error('Error processing template:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process template',
    });
  }
};
