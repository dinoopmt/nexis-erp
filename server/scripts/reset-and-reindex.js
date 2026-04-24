/**
 * Reset MeiliSearch index and reindex all products with image field
 * This is needed after updating the displayedAttributes configuration
 * 
 * Run: node scripts/reset-and-reindex.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Product from '../Models/AddProduct.js';
import Grouping from '../Models/Grouping.js';
import UnitType from '../Models/UnitType.js';
import CurrentStock from '../Models/CurrentStock.js';
import { resetMeilisearchIndex, initializeMeilisearch } from '../config/meilisearch.js';
import { syncAllProductsToMeilisearch } from '../modules/inventory/services/ProductMeilisearchSync.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
};

const resetAndReindex = async () => {
  try {
    console.log('🔄 Starting MeiliSearch reset and full reindex...\n');
    
    // ✅ Initialize MeiliSearch
    console.log('📡 Initializing MeiliSearch...');
    await initializeMeilisearch();
    console.log('✅ MeiliSearch connected\n');
    
    // ✅ Reset index (delete and recreate with new config)
    console.log('🗑️  Resetting MeiliSearch index...');
    await resetMeilisearchIndex();
    console.log('✅ Index reset with new displayedAttributes configuration\n');
    
    // ✅ Reindex all products
    console.log('🔄 Reindexing all 31,831 products with image field...\n');
    const result = await syncAllProductsToMeilisearch();
    
    console.log('\n✅ Reset and reindex complete!');
    console.log(`   Indexed: ${result.indexed || 0}`);
    console.log(`   Failed: ${result.failed || 0}`);
    console.log('\n🎉 Products with images are now searchable and displayable!');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Reset and reindex error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
};

connectDB().then(resetAndReindex);
