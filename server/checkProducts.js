import mongoose from 'mongoose';
import Product from './Models/AddProduct.js';

async function check() {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nexis_erp';
    await mongoose.connect(uri);
    
    const total = await Product.countDocuments();
    const notDeleted = await Product.countDocuments({ isDeleted: false });
    const deleted = await Product.countDocuments({ isDeleted: true });
    const withImages = await Product.countDocuments({ imagePath: { $exists: true, $ne: null } });
    
    console.log('Total products:', total);
    console.log('Not deleted (isDeleted: false):', notDeleted);
    console.log('Deleted (isDeleted: true):', deleted);
    console.log('With imagePath:', withImages);
    
    const iphone = await Product.findOne({ name: 'I Phone' }).select('_id name imagePath isDeleted');
    console.log('\niPhone product:', iphone);
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}

check();
