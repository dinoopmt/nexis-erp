import express from 'express';
import InvoiceTemplate from '../Models/InvoiceTemplate.js';

const router = express.Router();

// ============ GET TEMPLATES ============

// Get all active templates
router.get('/', async (req, res) => {
  try {
    const templates = await InvoiceTemplate.find({ isActive: true })
      .populate('createdBy', 'name email')
      .sort({ isDefault: -1, createdAt: -1 });
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get template by ID
router.get('/:id', async (req, res) => {
  try {
    const template = await InvoiceTemplate.findById(req.params.id)
      .populate('createdBy', 'name email');
    
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    
    res.json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get template by language and type
router.get('/language/:language/type/:type', async (req, res) => {
  try {
    const { language, type } = req.params;
    const { withLogo = true } = req.query;
    
    const template = await InvoiceTemplate.findOne({
      language,
      templateType: type,
      includeLogo: withLogo === 'true',
      isActive: true
    });
    
    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: `Template not found for ${language} - ${type}` 
      });
    }
    
    res.json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ CREATE TEMPLATE ============

router.post('/', async (req, res) => {
  try {
    const { templateName, language, templateType, includeLogo, customDesign, htmlContent, cssContent, description } = req.body;
    
    // Check if template name already exists
    const exists = await InvoiceTemplate.findOne({ templateName });
    if (exists) {
      return res.status(400).json({ 
        success: false, 
        message: 'Template name already exists' 
      });
    }
    
    const template = new InvoiceTemplate({
      templateName,
      language,
      templateType,
      includeLogo,
      customDesign,
      htmlContent,
      cssContent,
      description,
      createdBy: req.user?._id
    });
    
    await template.save();
    
    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: template
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ UPDATE TEMPLATE ============

router.put('/:id', async (req, res) => {
  try {
    const { customDesign, htmlContent, cssContent, description, isActive, isDefault } = req.body;
    
    const template = await InvoiceTemplate.findByIdAndUpdate(
      req.params.id,
      {
        customDesign,
        htmlContent,
        cssContent,
        description,
        isActive,
        isDefault,
        updatedAt: new Date()
      },
      { returnDocument: 'after' }
    );
    
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    
    res.json({
      success: true,
      message: 'Template updated successfully',
      data: template
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ SET AS DEFAULT ============

router.put('/:id/set-default', async (req, res) => {
  try {
    const { language, templateType } = req.body;
    
    // Remove default from other templates with same language and type
    await InvoiceTemplate.updateMany(
      { language, templateType, isDefault: true },
      { isDefault: false }
    );
    
    // Set this as default
    const template = await InvoiceTemplate.findByIdAndUpdate(
      req.params.id,
      { isDefault: true },
      { returnDocument: 'after' }
    );
    
    res.json({
      success: true,
      message: 'Template set as default',
      data: template
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ DELETE TEMPLATE ============

router.delete('/:id', async (req, res) => {
  try {
    const template = await InvoiceTemplate.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { returnDocument: 'after' }
    );
    
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    
    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
