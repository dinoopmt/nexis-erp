import LpoTemplate from '../../../Models/LpoTemplate.js';
import GrnTemplate from '../../../Models/GrnTemplate.js';
import RtvTemplate from '../../../Models/RtvTemplate.js';

// Map template types to models
const modelMap = {
  'LPO': LpoTemplate,
  'GRN': GrnTemplate,
  'RTV': RtvTemplate
};

// Generic template controller factory
export const createTemplateController = (templateType) => {
  const Model = modelMap[templateType];
  
  if (!Model) {
    throw new Error(`Invalid template type: ${templateType}`);
  }

  return {
    // Get all templates
    getAllTemplates: async (req, res) => {
      try {
        const templates = await Model.find({ isActive: true }).sort({ createdAt: -1 });
        res.status(200).json({
          success: true,
          data: templates
        });
      } catch (error) {
        console.error(`Error fetching ${templateType} templates:`, error);
        res.status(500).json({ success: false, message: `Failed to fetch ${templateType} templates`, error: error.message });
      }
    },

    // Get single template
    getTemplateById: async (req, res) => {
      try {
        const { id } = req.params;
        const template = await Model.findById(id);
        
        if (!template) {
          return res.status(404).json({ message: `${templateType} template not found` });
        }
        
        res.status(200).json(template);
      } catch (error) {
        console.error(`Error fetching ${templateType} template:`, error);
        res.status(500).json({ message: `Failed to fetch ${templateType} template`, error: error.message });
      }
    },

    // Create template
    createTemplate: async (req, res) => {
      try {
        const { templateName, language, includeLogo, customDesign, htmlContent, cssContent, createdBy } = req.body;

        // Validate required fields
        if (!templateName || !language || !htmlContent) {
          return res.status(400).json({ message: 'templateName, language, and htmlContent are required' });
        }

        const newTemplate = new Model({
          templateName,
          language,
          templateType,
          includeLogo,
          customDesign,
          htmlContent,
          cssContent,
          createdBy: createdBy || 'admin',
          isActive: true
        });

        const savedTemplate = await newTemplate.save();
        res.status(201).json(savedTemplate);
      } catch (error) {
        if (error.code === 11000) {
          return res.status(400).json({ message: 'Template name already exists' });
        }
        console.error(`Error creating ${templateType} template:`, error);
        res.status(500).json({ message: `Failed to create ${templateType} template`, error: error.message });
      }
    },

    // Update template
    updateTemplate: async (req, res) => {
      try {
        const { id } = req.params;
        const { templateName, language, includeLogo, customDesign, htmlContent, cssContent } = req.body;

        const template = await Model.findById(id);
        if (!template) {
          return res.status(404).json({ message: `${templateType} template not found` });
        }

        // Update fields
        if (templateName) template.templateName = templateName;
        if (language) template.language = language;
        if (includeLogo !== undefined) template.includeLogo = includeLogo;
        if (customDesign) template.customDesign = { ...template.customDesign, ...customDesign };
        if (htmlContent) template.htmlContent = htmlContent;
        if (cssContent) template.cssContent = cssContent;

        const updatedTemplate = await template.save();
        res.status(200).json(updatedTemplate);
      } catch (error) {
        if (error.code === 11000) {
          return res.status(400).json({ message: 'Template name already exists' });
        }
        console.error(`Error updating ${templateType} template:`, error);
        res.status(500).json({ message: `Failed to update ${templateType} template`, error: error.message });
      }
    },

    // Delete template
    deleteTemplate: async (req, res) => {
      try {
        const { id } = req.params;
        const template = await Model.findById(id);
        
        if (!template) {
          return res.status(404).json({ message: `${templateType} template not found` });
        }

        // Soft delete - mark as inactive
        template.isActive = false;
        await template.save();

        res.status(200).json({ message: `${templateType} template deleted successfully` });
      } catch (error) {
        console.error(`Error deleting ${templateType} template:`, error);
        res.status(500).json({ message: `Failed to delete ${templateType} template`, error: error.message });
      }
    },

    // Get default template
    getDefaultTemplate: async (req, res) => {
      try {
        const defaultTemplate = await Model.findOne({ isActive: true }).sort({ createdAt: 1 }).limit(1);
        
        if (!defaultTemplate) {
          return res.status(404).json({ message: `No active ${templateType} templates found` });
        }
        
        res.status(200).json(defaultTemplate);
      } catch (error) {
        console.error(`Error fetching default ${templateType} template:`, error);
        res.status(500).json({ message: `Failed to fetch default ${templateType} template`, error: error.message });
      }
    }
  };
};

// Export specific controllers
export const lpoTemplateController = createTemplateController('LPO');
export const grnTemplateController = createTemplateController('GRN');
export const rtvTemplateController = createTemplateController('RTV');
