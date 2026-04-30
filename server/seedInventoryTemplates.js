import InventoryTemplate from './Models/InventoryTemplate.js';
import { LPO_TEMPLATE_EN, GRN_TEMPLATE_EN, RTV_TEMPLATE_EN } from './templates/inventoryTemplates.js';
import mongoose from 'mongoose';
import environment from './config/environment.js';

/**
 * Seed default inventory templates (LPO, GRN, RTV) to database
 * Run on server startup or manually via: node server/seedInventoryTemplates.js
 */
export async function seedInventoryTemplates(closeConnection = false) {
  let connection = null;
  try {
    console.log('🔄 Starting inventory template seeding...');
    
    // Only connect if not already connected
    if (mongoose.connection.readyState === 0) {
      console.log('📡 Connecting to MongoDB...');
      connection = await mongoose.connect(environment.MONGO_URI, {
        maxPoolSize: 50,
        minPoolSize: 10,
        maxIdleTimeMS: 45000,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        retryWrites: true,
        w: 'majority',
        journal: true,
      });
      console.log('✅ Database connected successfully');
    } else {
      console.log('✅ Using existing database connection');
    }

    // Define all templates to seed
    const templates = [
      // ============================================================================
      // LPO TEMPLATES
      // ============================================================================
      {
        ...LPO_TEMPLATE_EN,
        isActive: true,
        isDefault: true
      },

      // ============================================================================
      // GRN TEMPLATES
      // ============================================================================
      {
        ...GRN_TEMPLATE_EN,
        isActive: true,
        isDefault: true
      },

      // ============================================================================
      // RTV TEMPLATES
      // ============================================================================
      {
        ...RTV_TEMPLATE_EN,
        isActive: true,
        isDefault: true
      }
    ];

    console.log(`📝 Seeding ${templates.length} templates...`);

    // Upsert each template (update if exists, create if not)
    let createdCount = 0;
    let updatedCount = 0;
    
    for (const template of templates) {
      try {
        const result = await InventoryTemplate.findOneAndUpdate(
          { templateName: template.templateName },
          template,
          { upsert: true, new: true, runValidators: true }
        );
        
        if (result.isNew) {
          console.log(`  ✓ Created: ${template.templateName} (${template.documentType})`);
          createdCount++;
        } else {
          console.log(`  ✓ Updated: ${template.templateName} (${template.documentType})`);
          updatedCount++;
        }
      } catch (err) {
        console.error(`  ✗ Failed to seed ${template.templateName}:`, err.message);
      }
    }

    console.log(`\n✅ Inventory template seeding completed!`);
    console.log(`   Total: ${templates.length} templates`);
    console.log(`   Created: ${createdCount}`);
    console.log(`   Updated: ${updatedCount}`);

  } catch (error) {
    console.error('❌ Error seeding inventory templates:', error.message);
    if (error.stack) console.error(error.stack);
    throw error;
  } finally {
    // Close database connection only if we opened it (standalone mode)
    if (closeConnection && connection) {
      console.log('🔌 Closing database connection...');
      await mongoose.connection.close();
      console.log('✅ Connection closed');
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedInventoryTemplates(true)  // Pass true to close connection on exit
    .then(() => {
      console.log('✨ Seeding process completed successfully!');
      process.exit(0);
    })
    .catch(err => {
      console.error('💥 Seeding process failed:', err.message);
      process.exit(1);
    });
}
