/**
 * Migration Script: Create CurrentStock records for all products that don't have them
 * Run this once to backfill missing CurrentStock records
 * 
 * Usage: node scripts/migrate-current-stock.js
 */

import mongoose from 'mongoose';
import Product from '../Models/AddProduct.js';
import CurrentStock from '../Models/CurrentStock.js';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nexis-erp');
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  }
};

const migrateCurrentStock = async () => {
  try {
    console.log('🔄 Starting migration...\n');

    // Get all non-deleted products
    const allProducts = await Product.find({ isDeleted: false }).lean();
    console.log(`📦 Found ${allProducts.length} products`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const product of allProducts) {
      try {
        // Check if CurrentStock record exists
        const existingStock = await CurrentStock.findOne({ productId: product._id });

        if (existingStock) {
          skipped++;
          continue;
        }

        // Create CurrentStock record
        await CurrentStock.create({
          productId: product._id,
          quantityInStock: product.stock || 0,
          totalQuantity: product.stock || 0,
          availableQuantity: product.stock || 0,
          allocatedQuantity: 0,
          isDeleted: false,
        });

        created++;
        console.log(`✅ Created CurrentStock for: ${product.name} (qty: ${product.stock || 0})`);
      } catch (err) {
        errors++;
        console.error(`❌ Error for product ${product.name}:`, err.message);
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);

    await mongoose.disconnect();
    console.log('\n✅ Migration complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
};

connectDB().then(migrateCurrentStock);
