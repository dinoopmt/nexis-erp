import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Quotation from '../Models/Sales/Quotation.js';

dotenv.config();

async function checkQuotationNumber() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexis_erp';
    await mongoose.connect(mongoUri);

    const quotation = await Quotation.findById('69ec8f3d9d5800a0156b1d74');
    if (quotation) {
      console.log(`Quotation Number: ${quotation.quotationNumber}`);
      console.log(`First Item Note: "${quotation.items[0].note}"`);
      console.log(`First Item Image: "${quotation.items[0].image}"`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkQuotationNumber();
