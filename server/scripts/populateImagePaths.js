/**
 * Script to populate imagePath field for products with actual image files
 * Only sets imagePath to "images/products/prod_<productId>.jpg" if the file exists
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import Product from '../Models/AddProduct.js';
import HSNMaster from '../Models/HSNMaster.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexis_erp';
const IMAGES_DIR = path.resolve('./images/products');

async function populateImagePaths() {
  try {
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all products
    console.log('📦 Fetching all products...');
    const products = await Product.find({ isDeleted: false }).select('_id name');
    console.log(`📦 Found ${products.length} products to check`);

    if (products.length === 0) {
      console.log('No products to update');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Check which products have actual image files
    console.log(`\n🖼️  Scanning for image files in: ${IMAGES_DIR}`);
    const bulkOps = [];
    let productsWithImages = 0;

    for (const product of products) {
      const imagePath = `images/products/prod_${product._id}.jpg`;
      const fullPath = path.join(IMAGES_DIR, `prod_${product._id}.jpg`);

      if (fs.existsSync(fullPath)) {
        bulkOps.push({
          updateOne: {
            filter: { _id: product._id },
            update: {
              $set: { imagePath }
            }
          }
        });
        productsWithImages++;
        console.log(`   ✅ Found: ${product.name} (${product._id})`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   - Total products: ${products.length}`);
    console.log(`   - Products with images: ${productsWithImages}`);
    console.log(`   - Products without images: ${products.length - productsWithImages}`);

    if (bulkOps.length === 0) {
      console.log('\n⚠️  No products with images found');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Perform bulk update
    console.log(`\n🔄 Updating products with imagePath...`);
    const result = await Product.bulkWrite(bulkOps);
    console.log(`\n✅ Update completed!`);
    console.log(`   - Modified: ${result.modifiedCount}`);
    console.log(`   - Updated: ${result.upsertedCount}`);

    // Verification: Show which products got imagePath set
    console.log(`\n✨ Verification - Products with imagePath:`);
    const updatedProducts = await Product.find({ imagePath: { $exists: true, $ne: null } }).select('_id name imagePath');
    
    for (const product of updatedProducts) {
      console.log(`   ✅ ${product.name} -> ${product.imagePath}`);
    }

    console.log(`\n📈 Total products now with imagePath: ${updatedProducts.length}`);

    await mongoose.disconnect();
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

populateImagePaths();
