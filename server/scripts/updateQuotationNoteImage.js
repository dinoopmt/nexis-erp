import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Quotation from '../Models/Sales/Quotation.js';

dotenv.config();

async function updateQuotation() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexis_erp';
    console.log(`🔌 Connecting to MongoDB: ${mongoUri}`);
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find the quotation
    console.log('\n🔍 Finding quotation QT/2025-26/0008...');
    const quotation = await Quotation.findOne({ quotationNumber: 'QT/2025-26/0008' });
    
    if (!quotation) {
      console.log('❌ Quotation not found');
      process.exit(1);
    }

    console.log('✅ Quotation found');
    console.log(`   Items before: ${quotation.items.length}`);
    console.log(`   First item:`, JSON.stringify(quotation.items[0], null, 2));

    // Update items with note and image
    quotation.items = quotation.items.map((item, idx) => {
      if (idx === 0) {
        // Add note and image to first item for testing
        return {
          ...item.toObject ? item.toObject() : item,
          note: 'Test back Note',
          image: 'images/products/prod_69eb8e4a2b84451d41aedfec.jpg'
        };
      }
      return item;
    });

    // Save the updated quotation
    console.log('\n💾 Saving updated quotation...');
    await quotation.save();
    console.log('✅ Quotation saved successfully');

    // Verify the update
    const updatedQuotation = await Quotation.findOne({ quotationNumber: 'QT/2025-26/0008' });
    console.log('\n✅ Verification:');
    console.log(`   First item after update:`, JSON.stringify(updatedQuotation.items[0], null, 2));

    console.log('\n✅ UPDATE COMPLETE - Quotation now has note and image in first item');
    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

updateQuotation();
