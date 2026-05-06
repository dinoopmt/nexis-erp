import mongoose from 'mongoose';
import dotenv from 'dotenv';
import InvoiceTemplate from './Models/InvoiceTemplate.js';
import { THERMAL_INVOICE_TEMPLATE_EN_58MM, THERMAL_INVOICE_TEMPLATE_AR_58MM, THERMAL_INVOICE_TEMPLATE_EN_80MM, THERMAL_INVOICE_TEMPLATE_AR_80MM } from './templates/thermalInvoiceTemplate.js';

dotenv.config();

const MONGO_URI = process.env.DB_URI || 'mongodb://127.0.0.1:27017/nexis_erp';

async function seedThermalTemplates() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      retryWrites: true
    });
    console.log('✅ MongoDB connected');

    console.log('\n📄 Starting thermal template seeding...\n');

    // Helper function to clean template data
    const cleanTemplate = (template) => {
      const cleaned = { ...template };
      delete cleaned.createdBy; // Remove createdBy to avoid ObjectId validation issues
      return cleaned;
    };

    // Define thermal templates
    const thermalTemplates = [
      { ...cleanTemplate(THERMAL_INVOICE_TEMPLATE_EN_58MM), isActive: true, isDefault: false },
      { ...cleanTemplate(THERMAL_INVOICE_TEMPLATE_AR_58MM), isActive: true, isDefault: false },
      { ...cleanTemplate(THERMAL_INVOICE_TEMPLATE_EN_80MM), isActive: true, isDefault: false },
      { ...cleanTemplate(THERMAL_INVOICE_TEMPLATE_AR_80MM), isActive: true, isDefault: false }
    ];

    let createdCount = 0;
    let updatedCount = 0;

    // Seed each thermal template
    for (const template of thermalTemplates) {
      try {
        const result = await InvoiceTemplate.findOneAndUpdate(
          { templateName: template.templateName },
          template,
          { upsert: true, returnDocument: 'after', runValidators: true }
        );
        
        if (result.isNew) {
          console.log(`✅ Created: ${template.templateName} (${template.language})`);
          createdCount++;
        } else {
          console.log(`📝 Updated: ${template.templateName} (${template.language})`);
          updatedCount++;
        }
      } catch (err) {
        console.error(`❌ Error seeding ${template.templateName}:`, err.message);
      }
    }

    console.log(`\n✨ Thermal template seeding completed!`);
    console.log(`   Created: ${createdCount} templates`);
    console.log(`   Updated: ${updatedCount} templates`);

    // Verify templates in database
    console.log('\n🔍 Verifying thermal templates in database...');
    const verifyTemplates = await InvoiceTemplate.find({ templateName: /Thermal/ });
    console.log(`   Found ${verifyTemplates.length} thermal templates:`);
    verifyTemplates.forEach(t => {
      console.log(`   • ${t.templateName} (${t.language}) - Status: ${t.isActive ? 'ACTIVE' : 'INACTIVE'}`);
    });

    // Disconnect
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB disconnected');
    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal error during template seeding:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run
seedThermalTemplates();
