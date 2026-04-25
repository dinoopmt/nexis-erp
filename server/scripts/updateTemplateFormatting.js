import mongoose from 'mongoose';
import dotenv from 'dotenv';
import InvoiceTemplate from '../Models/InvoiceTemplate.js';

dotenv.config();

async function updateTemplateFormatting() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexis_erp';
    console.log(`🔌 Connecting to MongoDB...`);
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected\n');

    // Find the Quotation template
    const template = await InvoiceTemplate.findById('69eb8b46908f29f6d7a8a6d2');
    
    if (!template) {
      console.log('❌ Template not found');
      process.exit(1);
    }

    console.log(`📋 Found template: ${template.templateName}`);
    
    let updatedHtml = template.htmlContent;
    
    // Remove "- " from discount line
    updatedHtml = updatedHtml.replace(
      `<td class="value">- {{currency quotation.discountAmount decimals=company.decimalPlaces}}</td>`,
      `<td class="value">{{currency quotation.discountAmount decimals=company.decimalPlaces}}</td>`
    );
    
    // Remove "+ " from tax line
    updatedHtml = updatedHtml.replace(
      `<td class="value">+ {{currency quotation.vatAmount decimals=company.decimalPlaces}}</td>`,
      `<td class="value">{{currency quotation.vatAmount decimals=company.decimalPlaces}}</td>`
    );
    
    // Update note background to white
    updatedHtml = updatedHtml.replace(
      `background-color: #fef3c7;`,
      `background-color: white;`
    );

    // Check if changes were made
    if (updatedHtml === template.htmlContent) {
      console.log('ℹ️ Template already has correct formatting');
    } else {
      console.log('✏️ Updating template formatting...');
      template.htmlContent = updatedHtml;
      await template.save();
      console.log('✅ Template updated successfully');
    }

    console.log('\n✅ DONE');
    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

updateTemplateFormatting();
