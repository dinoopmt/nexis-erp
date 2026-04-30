/**
 * Inventory Template Routes
 * Unified endpoint for LPO, GRN, RTV templates
 * Replaces: /lpo-templates, /grn-templates, /rtv-templates
 */
import express from 'express';
import InventoryTemplate from '../Models/InventoryTemplate.js';
import { errorHandler } from '../config/errorHandler.js';

const router = express.Router();

// ✅ GET all templates (with filters)
router.get('/', async (req, res) => {
  try {
    const { documentType, language, isActive } = req.query;
    
    const filter = {};
    if (documentType) filter.documentType = documentType.toUpperCase();
    if (language) filter.language = language.toUpperCase();
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    const templates = await InventoryTemplate.find(filter)
      .sort({ documentType: 1, language: 1, isDefault: -1, createdAt: -1 })
      .select('-htmlContent -cssContent'); // Exclude large content fields for list view
    
    res.json({
      success: true,
      data: templates,
      count: templates.length
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return errorHandler(res, 'Failed to fetch templates', 500, error);
  }
});

// ✅ GET template by ID (with full content)
router.get('/:id', async (req, res) => {
  try {
    const template = await InventoryTemplate.findById(req.params.id);
    
    if (!template) {
      return errorHandler(res, 'Template not found', 404);
    }
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    return errorHandler(res, 'Failed to fetch template', 500, error);
  }
});

// ✅ GET default template for document type & language
router.get('/default/:documentType/:language', async (req, res) => {
  try {
    const { documentType, language } = req.params;
    
    const template = await InventoryTemplate.findOne({
      documentType: documentType.toUpperCase(),
      language: language.toUpperCase(),
      isDefault: true,
      isActive: true
    });
    
    if (!template) {
      // Fallback: return first active template
      const fallback = await InventoryTemplate.findOne({
        documentType: documentType.toUpperCase(),
        language: language.toUpperCase(),
        isActive: true
      });
      
      if (!fallback) {
        return res.json({
          success: false,
          data: null,
          message: 'No templates found for this document type'
        });
      }
      
      return res.json({ success: true, data: fallback });
    }
    
    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Error fetching default template:', error);
    return errorHandler(res, 'Failed to fetch default template', 500, error);
  }
});

// ✅ CREATE template
router.post('/', async (req, res) => {
  try {
    const { 
      templateName, 
      documentType, 
      language = 'EN',
      description = '',
      includeLogo = true,
      customDesign = {},
      htmlContent,
      cssContent = '',
      isActive = true,
      isDefault = false
    } = req.body;
    
    // ✅ Validation
    if (!templateName || !templateName.trim()) {
      return errorHandler(res, 'Template name is required', 400);
    }
    
    if (!documentType || !['LPO', 'GRN', 'RTV'].includes(documentType.toUpperCase())) {
      return errorHandler(res, 'Valid document type required (LPO, GRN, RTV)', 400);
    }
    
    if (!htmlContent || !htmlContent.trim()) {
      return errorHandler(res, 'HTML content is required', 400);
    }
    
    // ✅ Check duplicate name
    const existing = await InventoryTemplate.findOne({ templateName });
    if (existing) {
      return errorHandler(res, `Template "${templateName}" already exists`, 400);
    }
    
    // ✅ Create template
    const newTemplate = new InventoryTemplate({
      templateName,
      documentType: documentType.toUpperCase(),
      language: language.toUpperCase(),
      description,
      includeLogo,
      customDesign: {
        headerColor: customDesign.headerColor || '#1e40af',
        bodyFont: customDesign.bodyFont || 'Arial',
        pageSize: customDesign.pageSize || 'A4',
        margins: customDesign.margins || { top: 10, bottom: 10, left: 10, right: 10 },
        showSerialNumbers: customDesign.showSerialNumbers !== false,
        showQrCode: customDesign.showQrCode || false,
        showBarcode: customDesign.showBarcode || false,
        showBatchInfo: customDesign.showBatchInfo !== false,
        showExpiryDates: customDesign.showExpiryDates !== false,
        showReturnReason: customDesign.showReturnReason !== false,
        showCreditNoteRef: customDesign.showCreditNoteRef !== false
      },
      htmlContent,
      cssContent,
      isActive,
      isDefault,
      createdBy: req.user?._id || null
    });
    
    await newTemplate.save();
    
    res.status(201).json({
      success: true,
      data: newTemplate,
      message: `${documentType} template created successfully`
    });
  } catch (error) {
    console.error('Error creating template:', error);
    return errorHandler(res, 'Failed to create template', 500, error);
  }
});

// ✅ UPDATE template
router.put('/:id', async (req, res) => {
  try {
    const template = await InventoryTemplate.findById(req.params.id);
    
    if (!template) {
      return errorHandler(res, 'Template not found', 404);
    }
    
    // ✅ Update allowed fields
    const updates = {};
    const allowedFields = [
      'templateName', 'description', 'includeLogo', 
      'customDesign', 'htmlContent', 'cssContent',
      'isActive', 'isDefault', 'language'
    ];
    
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });
    
    updates.updatedBy = req.user?._id || null;
    
    // ✅ Validate if changing to default
    if (updates.isDefault && updates.isDefault === true) {
      await InventoryTemplate.updateMany(
        {
          _id: { $ne: template._id },
          documentType: template.documentType,
          language: updates.language || template.language,
          isDefault: true
        },
        { isDefault: false }
      );
    }
    
    const updated = await InventoryTemplate.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      data: updated,
      message: 'Template updated successfully'
    });
  } catch (error) {
    console.error('Error updating template:', error);
    return errorHandler(res, 'Failed to update template', 500, error);
  }
});

// ✅ DELETE template
router.delete('/:id', async (req, res) => {
  try {
    const template = await InventoryTemplate.findById(req.params.id);
    
    if (!template) {
      return errorHandler(res, 'Template not found', 404);
    }
    
    // ✅ Prevent deletion of only active default template
    if (template.isDefault && template.isActive) {
      const alternatives = await InventoryTemplate.countDocuments({
        _id: { $ne: template._id },
        documentType: template.documentType,
        language: template.language,
        isActive: true
      });
      
      if (alternatives === 0) {
        return errorHandler(res, 'Cannot delete the only active template for this document type', 400);
      }
    }
    
    await InventoryTemplate.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    return errorHandler(res, 'Failed to delete template', 500, error);
  }
});

// ✅ BULK GET by type (for quick lookup)
router.post('/bulk', async (req, res) => {
  try {
    const { documentTypes = ['LPO', 'GRN', 'RTV'], language = 'EN', activeOnly = true } = req.body;
    
    const filter = {
      documentType: { $in: documentTypes.map(t => t.toUpperCase()) },
      language: language.toUpperCase()
    };
    
    if (activeOnly) filter.isActive = true;
    
    const templates = await InventoryTemplate.find(filter)
      .select('-htmlContent -cssContent')
      .sort({ documentType: 1, isDefault: -1 });
    
    const grouped = {};
    templates.forEach(t => {
      if (!grouped[t.documentType]) grouped[t.documentType] = [];
      grouped[t.documentType].push(t);
    });
    
    res.json({
      success: true,
      data: grouped
    });
  } catch (error) {
    console.error('Error in bulk fetch:', error);
    return errorHandler(res, 'Failed to fetch templates', 500, error);
  }
});

export default router;
