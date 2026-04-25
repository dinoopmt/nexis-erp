import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Quotation from '../Models/Sales/Quotation.js';

dotenv.config();

async function updateCorrectQuotation() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexis_erp';
    console.log(`🔌 Connecting to MongoDB: ${mongoUri}`);
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Update the SPECIFIC document ID that's being rendered
    const documentId = '69ecaf2f4c8c2b3a490fd5b1';
    
    console.log(`🔍 Finding quotation by _id: ${documentId}...`);
    const quotation = await Quotation.findById(documentId);
    
    if (!quotation) {
      console.log('❌ Quotation not found');
      process.exit(1);
    }

    console.log(`✅ Found quotation: ${quotation.quotationNumber}`);
    console.log(`   Items: ${quotation.items.length}`);
    console.log(`   Before - First item note: "${quotation.items[0].note}"`);
    console.log(`   Before - First item image: "${quotation.items[0].image}"`);

    // Update FIRST ITEM with note and image
    quotation.items[0] = {
      ...quotation.items[0].toObject ? quotation.items[0].toObject() : quotation.items[0],
      note: 'Test back Note',
      image: 'images/products/prod_69eb8e4a2b84451d41aedfec.jpg'
    };

    console.log('\n💾 Saving...');
    await quotation.save();
    console.log('✅ Saved');

    // Verify
    const updated = await Quotation.findById(documentId);
    console.log('\n✅ VERIFICATION:');
    console.log(`   After - First item note: "${updated.items[0].note}"`);
    console.log(`   After - First item image: "${updated.items[0].image}"`);

    console.log('\n✅ UPDATE COMPLETE');
    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

updateCorrectQuotation();
