import mongoose from 'mongoose';
import dotenv from 'dotenv';
import InvoiceTemplate from '../Models/InvoiceTemplate.js';

dotenv.config();

async function fixQuotationHeader() {
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
    
    // Fix the logo conditional
    updatedHtml = updatedHtml.replace(
      `{{#withLogo}}`,
      `{{#if store.logoUrl}}`
    );
    
    updatedHtml = updatedHtml.replace(
      `{{/withLogo}}`,
      `{{/if}}`
    );
    
    // Fix company header to use store data
    updatedHtml = updatedHtml.replace(
      `<h1 class="company-name">{{company.companyName}}</h1>`,
      `<h1 class="company-name">{{store.storeName}}</h1>`
    );
    
    // Fix company address details to use store data
    updatedHtml = updatedHtml.replace(
      `{{company.address}}<br>
          {{company.city}}, {{company.state}} {{company.country}}<br>
          Email: {{company.email}} | Phone: {{company.phone}}<br>
          Tax ID: {{company.taxId}}`,
      `{{store.address1}}<br>
          {{store.address2}}<br>
          Email: {{store.email}} | Phone: {{store.phone}}<br>
          Tax ID: {{store.taxNumber}}`
    );

    if (updatedHtml === template.htmlContent) {
      console.log('ℹ️ Template already has correct header');
    } else {
      console.log('✏️ Updating quotation header to show store details and logo...');
      template.htmlContent = updatedHtml;
      await template.save();
      console.log('✅ Template updated successfully');
    }

    console.log('\n✅ DONE - Quotation header now shows store details and logo');
    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fixQuotationHeader();
