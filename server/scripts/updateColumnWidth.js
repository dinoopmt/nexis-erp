import mongoose from 'mongoose';
import dotenv from 'dotenv';
import InvoiceTemplate from '../Models/InvoiceTemplate.js';

dotenv.config();

async function updateColumnWidth() {
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
    
    // Update col-rate from 20% to 12%
    updatedHtml = updatedHtml.replace(
      `.col-rate { width: 20%;`,
      `.col-rate { width: 12%;`
    );
    
    // Update col-amount from 20% to 12%
    updatedHtml = updatedHtml.replace(
      `.col-amount { width: 20%;`,
      `.col-amount { width: 12%;`
    );

    if (updatedHtml === template.htmlContent) {
      console.log('ℹ️ Template already has 12% column widths');
    } else {
      console.log('✏️ Updating column widths to 12%...');
      template.htmlContent = updatedHtml;
      await template.save();
      console.log('✅ Template updated successfully');
    }

    console.log('\n✅ DONE - Unit Price and Amount columns now 12% width');
    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

updateColumnWidth();
