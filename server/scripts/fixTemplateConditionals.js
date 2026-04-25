import mongoose from 'mongoose';
import dotenv from 'dotenv';
import InvoiceTemplate from '../Models/InvoiceTemplate.js';

dotenv.config();

async function fixTemplateConditionals() {
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
    
    // Fix the conditionals: {{#image}} → {{#if image}}
    let updatedHtml = template.htmlContent;
    
    // Replace image conditional (simple string replacement)
    updatedHtml = updatedHtml.replace(
      `{{#image}}<img src="{{image}}" alt="{{itemName}}" class="item-thumbnail" />{{/image}}`,
      `{{#if image}}<img src="{{image}}" alt="{{itemName}}" class="item-thumbnail" />{{/if}}`
    );
    
    // Replace note conditional (simple string replacement)
    updatedHtml = updatedHtml.replace(
      `{{#note}}<div class="item-note">{{note}}</div>{{/note}}`,
      `{{#if note}}<div class="item-note">{{note}}</div>{{/if}}`
    );

    // Check if changes were made
    if (updatedHtml === template.htmlContent) {
      console.log('ℹ️ Template already has correct syntax');
    } else {
      console.log('✏️ Updating template with correct Handlebars syntax...');
      template.htmlContent = updatedHtml;
      await template.save();
      console.log('✅ Template updated successfully');
    }

    console.log('\n✅ DONE - Template conditionals are now {{#if}} instead of {{#...}}');
    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fixTemplateConditionals();
