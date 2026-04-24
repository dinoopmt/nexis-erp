import mongoose from 'mongoose';
import Product from './Models/AddProduct.js';

async function checkDb() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexiserp';
    console.log('[*] Connecting to:', uri);
    await mongoose.connect(uri);
    console.log('[OK] Connected');
    
    const count = await Product.countDocuments();
    console.log('[PRODUCTS] Total products in database:', count);
    
    const sample = await Product.findOne().select('name _id imagePath');
    console.log('[SAMPLE] Product data:', sample);
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('[ERROR]:', err.message);
  }
  process.exit(0);
}

checkDb();
