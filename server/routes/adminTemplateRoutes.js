import { QUOTATION_TEMPLATE_EN_WITH_LOGO, QUOTATION_TEMPLATE_EN_WITHOUT_LOGO } from '../templates/quotationTemplates.js';
import InvoiceTemplate from '../Models/InvoiceTemplate.js';

/**
 * Admin endpoint to update quotation templates with note & image support
 * GET /admin/update-quotation-templates
 */
export const updateQuotationTemplates = async (req, res) => {
  try {
    console.log('🔄 Updating quotation templates with note & image support...');

    // Update WITH_LOGO template
    const withLogoResult = await InvoiceTemplate.findOneAndUpdate(
      { templateName: 'Quotation_EN_with_Logo', templateType: 'QUOTATION' },
      {
        htmlContent: QUOTATION_TEMPLATE_EN_WITH_LOGO.htmlContent,
        cssContent: QUOTATION_TEMPLATE_EN_WITH_LOGO.cssContent,
        updatedAt: new Date()
      },
      { upsert: true, returnDocument: 'after' }
    );

    console.log('✅ WITH_LOGO template updated:', withLogoResult._id);

    // Update WITHOUT_LOGO template
    const withoutLogoResult = await InvoiceTemplate.findOneAndUpdate(
      { templateName: 'Quotation_EN_without_Logo', templateType: 'QUOTATION' },
      {
        htmlContent: QUOTATION_TEMPLATE_EN_WITHOUT_LOGO.htmlContent,
        cssContent: QUOTATION_TEMPLATE_EN_WITHOUT_LOGO.cssContent,
        updatedAt: new Date()
      },
      { upsert: true, returnDocument: 'after' }
    );

    console.log('✅ WITHOUT_LOGO template updated:', withoutLogoResult._id);

    res.json({
      success: true,
      message: 'Quotation templates updated successfully',
      templates: {
        withLogo: withLogoResult._id,
        withoutLogo: withoutLogoResult._id
      }
    });

  } catch (err) {
    console.error('❌ Error updating templates:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
