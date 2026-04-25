import mongoose from 'mongoose';
import dotenv from 'dotenv';
import InvoiceTemplate from '../Models/InvoiceTemplate.js';

dotenv.config();

async function fixLogoSize() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexis_erp';
    console.log(`🔌 Connecting to MongoDB...`);
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected\n');

    const template = await InvoiceTemplate.findById('69eb8b46908f29f6d7a8a6d2');
    
    if (!template) {
      console.log('❌ Template not found');
      process.exit(1);
    }

    console.log(`📋 Found template: ${template.templateName}`);
    
    let updatedHtml = template.htmlContent;
    
    // Fix logo size from 120px to 80px
    updatedHtml = updatedHtml.replace(
      `.logo { max-width: 120px;`,
      `.logo { max-width: 80px;`
    );

    if (updatedHtml === template.htmlContent) {
      console.log('ℹ️ Template already has 80px logo');
    } else {
      console.log('✏️ Fixing logo size to 80px...');
      template.htmlContent = updatedHtml;
      await template.save();
      console.log('✅ Template updated successfully');
    }

    console.log('\n✅ DONE - Logo size set to 80px');
    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fixLogoSize();
