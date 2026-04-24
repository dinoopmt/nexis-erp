/**
 * Reindex all products to Meilisearch with image field
 * This script is needed after adding the image field to MeiliSearch indexing
 * 
 * Run: node scripts/reindex-products-with-images.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Product from '../Models/AddProduct.js';
import Grouping from '../Models/Grouping.js';
import UnitType from '../Models/UnitType.js';
import CurrentStock from '../Models/CurrentStock.js';
import { initializeMeilisearch } from '../config/meilisearch.js';
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

const reindexProducts = async () => {
  try {
    console.log('🔄 Starting product reindex with image field...\n');
    
    // ✅ Initialize MeiliSearch FIRST
    console.log('📡 Initializing MeiliSearch...');
    await initializeMeilisearch();
    console.log('✅ MeiliSearch connected\n');
    
    const result = await syncAllProductsToMeilisearch();
    
    console.log('\n✅ Reindex complete!');
    console.log(`   Indexed: ${result.indexed || 0}`);
    console.log(`   Failed: ${result.failed || 0}`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Reindex error:', err.message);
    process.exit(1);
  }
};

connectDB().then(reindexProducts);
