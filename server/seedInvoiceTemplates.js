import InvoiceTemplate from './Models/InvoiceTemplate.js';
import { INVOICE_TEMPLATE_EN_WITH_LOGO, INVOICE_TEMPLATE_AR_WITH_LOGO } from './templates/invoiceTemplates.js';
import { THERMAL_INVOICE_TEMPLATE_EN_58MM, THERMAL_INVOICE_TEMPLATE_AR_58MM, THERMAL_INVOICE_TEMPLATE_EN_80MM, THERMAL_INVOICE_TEMPLATE_AR_80MM } from './templates/thermalInvoiceTemplate.js';

/**
 * Seed default invoice templates to database
 * Run on server startup or manually via: node server/seedInvoiceTemplates.js
 */
export async function seedInvoiceTemplates() {
  try {
    console.log('Starting invoice template seeding...');

    // Define all templates to seed
    const templates = [
      {
        ...INVOICE_TEMPLATE_EN_WITH_LOGO,
        templateName: 'Invoice_EN_with_Logo',
        isActive: true,
        isDefault: true
      },
      {
        templateName: 'Invoice_EN_without_Logo',
        language: 'EN',
        templateType: 'INVOICE',
        includeLogo: false,
        customDesign: INVOICE_TEMPLATE_EN_WITH_LOGO.customDesign,
        htmlContent: INVOICE_TEMPLATE_EN_WITH_LOGO.htmlContent.replace(
          '{{#withLogo}}',
          '{{#if false}}'
        ).replace(
          '{{/withLogo}}',
          '{{/if}}'
        ),
        cssContent: INVOICE_TEMPLATE_EN_WITH_LOGO.cssContent,
        isActive: true,
        isDefault: false
      },
      {
        ...INVOICE_TEMPLATE_AR_WITH_LOGO,
        templateName: 'Invoice_AR_with_Logo',
        isActive: true,
        isDefault: true
      },
      {
        templateName: 'Invoice_AR_without_Logo',
        language: 'AR',
        templateType: 'INVOICE',
        includeLogo: false,
        customDesign: INVOICE_TEMPLATE_AR_WITH_LOGO.customDesign,
        htmlContent: INVOICE_TEMPLATE_AR_WITH_LOGO.htmlContent.replace(
          '{{#withLogo}}',
          '{{#if false}}'
        ).replace(
          '{{/withLogo}}',
          '{{/if}}'
        ),
        cssContent: INVOICE_TEMPLATE_AR_WITH_LOGO.cssContent,
        isActive: true,
        isDefault: false
      },
      // ✅ Thermal Invoice Templates for Supermarket POS (58mm)
      {
        ...THERMAL_INVOICE_TEMPLATE_EN_58MM,
        isActive: true,
        isDefault: false
        // Note: createdBy field is removed to avoid ObjectId validation issues
      },
      {
        ...THERMAL_INVOICE_TEMPLATE_AR_58MM,
        isActive: true,
        isDefault: false
      },
      // ✅ Thermal Invoice Templates for Supermarket POS (80mm)
      {
        ...THERMAL_INVOICE_TEMPLATE_EN_80MM,
        isActive: true,
        isDefault: false
      },
      {
        ...THERMAL_INVOICE_TEMPLATE_AR_80MM,
        isActive: true,
        isDefault: false
      }
    ];

    // Upsert each template (update if exists, create if not)
    let createdCount = 0;
    for (const template of templates) {
      // Explicitly exclude createdBy to avoid ObjectId validation issues
      const { createdBy, ...templateData } = template;
      
      try {
        const result = await InvoiceTemplate.findOneAndUpdate(
          { templateName: template.templateName },
          templateData,
          { upsert: true, returnDocument: 'after' }
        );
        console.log(`✓ Seeded: ${template.templateName}`);
        createdCount++;
      } catch (err) {
        console.error(`✗ Error seeding ${template.templateName}:`, err.message);
      }
    }

    console.log(`✅ Invoice template seeding completed successfully!`);
    console.log(`Total templates: ${templates.length} (EN×2 Standard, AR×2 Standard, EN+AR×2 Thermal 58mm, EN+AR×2 Thermal 80mm) - ${createdCount} new created`);

  } catch (error) {
    console.error('❌ Error seeding invoice templates:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedInvoiceTemplates()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
