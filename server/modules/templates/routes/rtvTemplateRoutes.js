import express from 'express';
import { rtvTemplateController } from '../controllers/templateController.js';

const router = express.Router();

// Get all RTV templates
router.get('/', rtvTemplateController.getAllTemplates);

// Get default RTV template
router.get('/default', rtvTemplateController.getDefaultTemplate);

// Create new RTV template
router.post('/', rtvTemplateController.createTemplate);

// Get single RTV template
router.get('/:id', rtvTemplateController.getTemplateById);

// Update RTV template
router.put('/:id', rtvTemplateController.updateTemplate);

// Delete RTV template
router.delete('/:id', rtvTemplateController.deleteTemplate);

export default router;
