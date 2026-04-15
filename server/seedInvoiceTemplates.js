import InvoiceTemplate from './Models/InvoiceTemplate.js';
import { INVOICE_TEMPLATE_EN_WITH_LOGO, INVOICE_TEMPLATE_AR_WITH_LOGO } from './templates/invoiceTemplates.js';

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
      }
    ];

    // Upsert each template (update if exists, create if not)
    let createdCount = 0;
    for (const template of templates) {
      const result = await InvoiceTemplate.findOneAndUpdate(
        { templateName: template.templateName },
        template,
        { upsert: true, returnDocument: 'after', runValidators: true }
      );
      
      if (result.isNew) {
        console.log(`✓ Created: ${template.templateName}`);
        createdCount++;
      } else {
        console.log(`✓ Updated: ${template.templateName}`);
      }
    }

    console.log(`✅ Invoice template seeding completed successfully!`);
    console.log(`Total templates: ${templates.length} (EN×2, AR×2) - ${createdCount} new created`);

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
