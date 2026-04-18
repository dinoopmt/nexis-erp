import InvoiceTemplate from './Models/InvoiceTemplate.js';
import { DELIVERY_NOTE_TEMPLATE_EN_WITH_LOGO, DELIVERY_NOTE_TEMPLATE_EN_WITHOUT_LOGO } from './templates/deliveryNoteTemplates.js';
import { QUOTATION_TEMPLATE_EN_WITH_LOGO, QUOTATION_TEMPLATE_EN_WITHOUT_LOGO } from './templates/quotationTemplates.js';
import { SALES_ORDER_TEMPLATE_EN_WITH_LOGO, SALES_ORDER_TEMPLATE_EN_WITHOUT_LOGO } from './templates/salesOrderTemplates.js';
import { SALES_RETURN_TEMPLATE_EN_WITH_LOGO, SALES_RETURN_TEMPLATE_EN_WITHOUT_LOGO } from './templates/salesReturnTemplates.js';

/**
 * Seed all document format templates to database
 * Includes: Delivery Note, Quotation, Sales Order, Sales Return
 * Run on server startup or manually via: node server/seedDocumentTemplates.js
 */
export async function seedDocumentTemplates() {
  try {
    console.log('🚀 Starting document format template seeding...');

    // Define all templates to seed
    const templates = [
      // ✅ Delivery Note Templates
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

      // ✅ Quotation Templates
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

      // ✅ Sales Order Templates
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

      // ✅ Sales Return Templates
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

    // Upsert each template (update if exists, create if not)
    let createdCount = 0;
    let updatedCount = 0;

    for (const template of templates) {
      const result = await InvoiceTemplate.findOneAndUpdate(
        { templateName: template.templateName },
        template,
        { 
          upsert: true, 
          returnDocument: 'after', 
          runValidators: true 
        }
      );
      
      if (result.isNew) {
        console.log(`   ✓ Created: ${template.templateName}`);
        createdCount++;
      } else {
        console.log(`   ✓ Updated: ${template.templateName}`);
        updatedCount++;
      }
    }

    console.log('\n✅ Document template seeding completed successfully!');
    console.log(`   📊 Total templates seeded: ${templates.length}`);
    console.log(`   ✨ New created: ${createdCount}`);
    console.log(`   🔄 Updated: ${updatedCount}`);
    console.log(`\n   Document Types:`);
    console.log(`      • Delivery Note (2 templates)`);
    console.log(`      • Quotation (2 templates)`);
    console.log(`      • Sales Order (2 templates)`);
    console.log(`      • Sales Return (2 templates)`);

    return { success: true, created: createdCount, updated: updatedCount };
  } catch (error) {
    console.error('❌ Error seeding document templates:', error);
    throw error;
  }
}

// Allow running as standalone script
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = await seedDocumentTemplates();
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

export default seedDocumentTemplates;
