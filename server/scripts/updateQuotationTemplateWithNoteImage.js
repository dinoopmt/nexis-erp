import mongoose from 'mongoose';
import { QUOTATION_TEMPLATE_EN_WITH_LOGO, QUOTATION_TEMPLATE_EN_WITHOUT_LOGO } from '../templates/quotationTemplates.js';
import dotenv from 'dotenv';

dotenv.config();

async function updateTemplates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const templatesCollection = db.collection('invoicetemplates');

    // Update WITH_LOGO template
    const withLogoResult = await templatesCollection.updateOne(
      { templateName: 'Quotation_EN_with_Logo', templateType: 'QUOTATION' },
      {
        $set: {
          htmlContent: QUOTATION_TEMPLATE_EN_WITH_LOGO.htmlContent,
          cssContent: QUOTATION_TEMPLATE_EN_WITH_LOGO.cssContent,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    console.log('✅ WITH_LOGO template updated:', withLogoResult.modifiedCount, 'modified,', withLogoResult.upsertedId ? 'created' : '');

    // Update WITHOUT_LOGO template
    const withoutLogoResult = await templatesCollection.updateOne(
      { templateName: 'Quotation_EN_without_Logo', templateType: 'QUOTATION' },
      {
        $set: {
          htmlContent: QUOTATION_TEMPLATE_EN_WITHOUT_LOGO.htmlContent,
          cssContent: QUOTATION_TEMPLATE_EN_WITHOUT_LOGO.cssContent,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    console.log('✅ WITHOUT_LOGO template updated:', withoutLogoResult.modifiedCount, 'modified,', withoutLogoResult.upsertedId ? 'created' : '');

    console.log('\n✅ All quotation templates updated with note & image support!');
    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

updateTemplates();
