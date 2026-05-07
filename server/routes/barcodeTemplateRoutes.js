import express from 'express';
import BarcodeTemplate from '../Models/BarcodeTemplate.js';

const router = express.Router();

// ============ GET TEMPLATES ============

// Get all barcode templates (including inactive)
router.get('/', async (req, res) => {
  try {
    const templates = await BarcodeTemplate.find({ 
      $or: [
        { deleted: false },
        { deleted: { $exists: false } }
      ]
    })
      .sort({ isDefault: -1, createdDate: -1 });
    
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
    const template = await BarcodeTemplate.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'Barcode template not found' 
      });
    }
    
    res.json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get default barcode template
router.get('/default/template', async (req, res) => {
  try {
    const template = await BarcodeTemplate.findOne({
      isDefault: true,
      deleted: false,
      isActive: true
    });
    
    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'No default barcode template found' 
      });
    }
    
    res.json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get template by format
router.get('/format/:format', async (req, res) => {
  try {
    const { format } = req.params;
    
    const template = await BarcodeTemplate.findOne({
      'customDesign.format': format,
      deleted: false,
      isActive: true,
      isDefault: true
    });
    
    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: `No template found for format: ${format}` 
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
    const { 
      templateName, 
      templateType,
      configTxt,
      isActive,
      isDefault
    } = req.body;
    
    // Check if template name already exists
    const exists = await BarcodeTemplate.findOne({ 
      templateName,
      deleted: false
    });
    if (exists) {
      return res.status(400).json({ 
        success: false, 
        message: 'Template name already exists' 
      });
    }
    
    const template = new BarcodeTemplate({
      templateName,
      templateType: templateType || 'barcode_label',
      configTxt,
      isActive: isActive !== undefined ? isActive : true,
      isDefault: isDefault || false,
      createdBy: 'system',
      updatedBy: 'system',
      createdDate: new Date(),
      updateDate: new Date(),
      deleted: false
    });
    
    await template.save();
    
    res.status(201).json({
      success: true,
      message: 'Barcode template created successfully',
      data: template
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ UPDATE TEMPLATE ============

router.put('/:id', async (req, res) => {
  try {
    const { 
      templateName,
      templateType,
      configTxt, 
      isActive, 
      isDefault
    } = req.body;
    
    const updateData = {};
    if (templateName !== undefined) updateData.templateName = templateName;
    if (templateType !== undefined) updateData.templateType = templateType;
    if (configTxt !== undefined) updateData.configTxt = configTxt;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    updateData.updatedBy = 'system';
    updateData.updateDate = new Date();
    
    const template = await BarcodeTemplate.findByIdAndUpdate(
      req.params.id,
      updateData,
      { returnDocument: 'after' }
    );
    
    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'Barcode template not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Barcode template updated successfully',
      data: template
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ SET AS DEFAULT ============

router.put('/:id/set-default', async (req, res) => {
  try {
    // Remove default from other templates
    await BarcodeTemplate.updateMany(
      { isDefault: true, deleted: false },
      { isDefault: false }
    );
    
    // Set this as default
    const template = await BarcodeTemplate.findByIdAndUpdate(
      req.params.id,
      { 
        isDefault: true,
        updateDate: new Date()
      },
      { returnDocument: 'after' }
    );
    
    res.json({
      success: true,
      message: 'Barcode template set as default',
      data: template
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ SOFT DELETE TEMPLATE ============

router.delete('/:id', async (req, res) => {
  try {
    const template = await BarcodeTemplate.findByIdAndUpdate(
      req.params.id,
      { 
        deleted: true,
        isActive: false,
        updateDate: new Date()
      },
      { returnDocument: 'after' }
    );
    
    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'Barcode template not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Barcode template deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ BULK OPERATIONS ============

// Get templates by page size
router.get('/size/:pageSize', async (req, res) => {
  try {
    const { pageSize } = req.params;
    
    const templates = await BarcodeTemplate.find({
      'customDesign.pageSize': pageSize,
      deleted: false,
      isActive: true
    });
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Clone template
router.post('/:id/clone', async (req, res) => {
  try {
    const { newName } = req.body;
    
    const originalTemplate = await BarcodeTemplate.findById(req.params.id);
    
    if (!originalTemplate) {
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found' 
      });
    }
    
    // Check if new name exists
    const exists = await BarcodeTemplate.findOne({ 
      templateName: newName,
      deleted: false
    });
    if (exists) {
      return res.status(400).json({ 
        success: false, 
        message: 'New template name already exists' 
      });
    }
    
    const clonedTemplate = new BarcodeTemplate({
      ...originalTemplate.toObject(),
      _id: undefined,
      templateName: newName,
      name: newName,
      isDefault: false,
      createdBy: 'system',
      updatedBy: 'system',
      createdDate: new Date(),
      updateDate: new Date()
    });
    
    await clonedTemplate.save();
    
    res.status(201).json({
      success: true,
      message: 'Template cloned successfully',
      data: clonedTemplate
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
