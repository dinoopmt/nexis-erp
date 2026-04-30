import express from 'express';
import { lpoTemplateController } from '../controllers/templateController.js';

const router = express.Router();

// Get all LPO templates
router.get('/', lpoTemplateController.getAllTemplates);

// Get default LPO template
router.get('/default', lpoTemplateController.getDefaultTemplate);

// Create new LPO template
router.post('/', lpoTemplateController.createTemplate);

// Get single LPO template
router.get('/:id', lpoTemplateController.getTemplateById);

// Update LPO template
router.put('/:id', lpoTemplateController.updateTemplate);

// Delete LPO template
router.delete('/:id', lpoTemplateController.deleteTemplate);

export default router;
