import express from 'express';
import { grnTemplateController } from '../controllers/templateController.js';

const router = express.Router();

// Get all GRN templates
router.get('/', grnTemplateController.getAllTemplates);

// Get default GRN template
router.get('/default', grnTemplateController.getDefaultTemplate);

// Create new GRN template
router.post('/', grnTemplateController.createTemplate);

// Get single GRN template
router.get('/:id', grnTemplateController.getTemplateById);

// Update GRN template
router.put('/:id', grnTemplateController.updateTemplate);

// Delete GRN template
router.delete('/:id', grnTemplateController.deleteTemplate);

export default router;
