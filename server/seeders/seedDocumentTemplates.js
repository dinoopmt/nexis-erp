import InvoiceTemplate from '../Models/InvoiceTemplate.js';
import { DELIVERY_NOTE_TEMPLATE_EN_WITH_LOGO, DELIVERY_NOTE_TEMPLATE_EN_WITHOUT_LOGO } from '../templates/deliveryNoteTemplates.js';
import { QUOTATION_TEMPLATE_EN_WITH_LOGO, QUOTATION_TEMPLATE_EN_WITHOUT_LOGO } from '../templates/quotationTemplates.js';
import { SALES_ORDER_TEMPLATE_EN_WITH_LOGO, SALES_ORDER_TEMPLATE_EN_WITHOUT_LOGO } from '../templates/salesOrderTemplates.js';
import { SALES_RETURN_TEMPLATE_EN_WITH_LOGO, SALES_RETURN_TEMPLATE_EN_WITHOUT_LOGO } from '../templates/salesReturnTemplates.js';

/**
 * Seed all document format templates to database
 * Includes: Delivery Note, Quotation, Sales Order, Sales Return
 * Each document type has WITH_LOGO and WITHOUT_LOGO variants
 * Run on server startup or manually via: node seeders/seedDocumentTemplates.js
 */
export const seedDocumentTemplates = async () => {
  try {
    console.log('?? Starting document format template seeding...');

    // Define all templates to seed
    const templates = [
      // ============================================================================
      // DELIVERY NOTE TEMPLATES
      // ============================================================================
      {
        ...DELIVERY_NOTE_TEMPLATE_EN_WITH_LOGO,
        templateName: 'DeliveryNote_EN_with_Logo',
        isActive: true,
        isDefault: true
      },
      {
        ...DELIVERY_NOTE_TEMPLATE_EN_WITHOUT_LOGO,
        templateName: 'DeliveryNote_EN_without_Logo',
        isActive: true,
        isDefault: false
      },

      // ============================================================================
      // QUOTATION TEMPLATES
      // ============================================================================
      {
        ...QUOTATION_TEMPLATE_EN_WITH_LOGO,
        templateName: 'Quotation_EN_with_Logo',
        isActive: true,
        isDefault: true
      },
      {
        ...QUOTATION_TEMPLATE_EN_WITHOUT_LOGO,
        templateName: 'Quotation_EN_without_Logo',
        isActive: true,
        isDefault: false
      },

      // ============================================================================
      // SALES ORDER TEMPLATES
      // ============================================================================
      {
        ...SALES_ORDER_TEMPLATE_EN_WITH_LOGO,
        templateName: 'SalesOrder_EN_with_Logo',
        isActive: true,
        isDefault: true
      },
      {
        ...SALES_ORDER_TEMPLATE_EN_WITHOUT_LOGO,
        templateName: 'SalesOrder_EN_without_Logo',
        isActive: true,
        isDefault: false
      },

      // ============================================================================
      // SALES RETURN TEMPLATES
      // ============================================================================
      {
        ...SALES_RETURN_TEMPLATE_EN_WITH_LOGO,
        templateName: 'SalesReturn_EN_with_Logo',
        isActive: true,
        isDefault: true
      },
      {
        ...SALES_RETURN_TEMPLATE_EN_WITHOUT_LOGO,
        templateName: 'SalesReturn_EN_without_Logo',
        isActive: true,
        isDefault: false
      }
    ];

    console.log(`📝 Seeding ${templates.length} document format templates...`);

    // Upsert each template (update if exists, create if not)
    let createdCount = 0;
    let updatedCount = 0;

    for (const template of templates) {
      try {
        // Exclude createdBy to avoid ObjectId validation issues
        const { createdBy, ...templateData } = template;
        
        const result = await InvoiceTemplate.findOneAndUpdate(
          { templateName: template.templateName },
          templateData,
          { upsert: true, returnDocument: 'after', runValidators: false }
        );
        
        if (result.isNew) {
          console.log(`  ✓ Created: ${template.templateName}`);
          createdCount++;
        } else {
          console.log(`  ✓ Updated: ${template.templateName}`);
          updatedCount++;
        }
      } catch (err) {
        console.error(`  ✗ Failed to seed ${template.templateName}:`, err.message);
      }
    }

    console.log('\n✅ Document template seeding completed successfully!');
    console.log(`   📊 Total: ${templates.length} templates`);
    console.log(`   📝 Created: ${createdCount}`);
    console.log(`   ✏️  Updated: ${updatedCount}`);

  } catch (error) {
    console.error('❌ Error seeding document templates:', error.message);
    if (error.stack) console.error(error.stack);
    throw error;
  }
};

export default seedDocumentTemplates;
