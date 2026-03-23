/**
 * printerConfigurationRoutes.js
 * Routes for printer configuration management
 */
import express from 'express';
import * as printerConfigurationController from '../controllers/printerConfigurationController.js';

const router = express.Router();

// Get all printer configurations
router.get('/', printerConfigurationController.getAllConfigurations);

// Get single printer configuration
router.get('/:id', printerConfigurationController.getConfigurationById);

// Create new printer configuration
router.post('/', printerConfigurationController.createConfiguration);

// Update printer configuration
router.put('/:id', printerConfigurationController.updateConfiguration);

// Delete printer configuration
router.delete('/:id', printerConfigurationController.deleteConfiguration);

// Prepare print command for a product
router.post('/:id/prepare-print', printerConfigurationController.preparePrintCommand);

// Process template with custom values (for testing)
router.post('/:id/process-template', printerConfigurationController.processTemplate);

export default router;
