#!/usr/bin/env node
/**
 * Debug script to diagnose search issues
 * Run: node DEBUG_SEARCH.js
 */

import axios from 'axios';
import { MeiliSearch } from 'meilisearch';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = 'http://localhost:5000';
const MEILISEARCH_URL = 'http://localhost:7700';
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/nexis_erp';

async function debugSearch() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 NEXIS-ERP SEARCH DEBUG TOOL');
  console.log('='.repeat(60) + '\n');

  try {
    // 1. Check MongoDB Product Count
    console.log('📊 Checking MongoDB Products...');
    await mongoose.connect(MONGODB_URL);
    const db = mongoose.connection.db;
    const productCount = await db.collection('products').countDocuments({});
    const deletedCount = await db.collection('products').countDocuments({ isDeleted: true });
    console.log(`  ✅ Total Products: ${productCount}`);
    console.log(`  ✅ Deleted Products: ${deletedCount}`);
    console.log(`  ✅ Active Products: ${productCount - deletedCount}\n`);

    // Sample products
    const sampleProducts = await db.collection('products').find({}).limit(3).toArray();
    if (sampleProducts.length > 0) {
      console.log('  📝 Sample Products:');
      sampleProducts.forEach((p, i) => {
        console.log(`    ${i + 1}. ${p.name} (Code: ${p.itemcode}, Barcode: ${p.barcode})`);
      });
      console.log('');
    }

    // 2. Check Meilisearch Index
    console.log('🔎 Checking Meilisearch Index...');
    const meilisearch = new MeiliSearch({
      host: MEILISEARCH_URL,
      apiKey: process.env.MEILISEARCH_API_KEY || ''
    });

    try {
      const index = await meilisearch.getIndex('products');
      const stats = await index.getStats();
      console.log(`  ✅ Index 'products' exists`);
      console.log(`  ✅ Documents in Index: ${stats.numberOfDocuments}`);
      console.log(`  ✅ Index Size: ${(stats.indexedDocuments).toLocaleString()} bytes\n`);
    } catch (err) {
      console.log(`  ❌ Index 'products' not found or error: ${err.message}\n`);
    }

    // 3. Test Search via API
    console.log('🌐 Testing API Search Endpoint...');
    try {
      const response = await axios.get(`${API_URL}/api/v1/products/getproducts?search=&page=1&limit=10`);
      console.log(`  ✅ API Response Status: ${response.status}`);
      console.log(`  ✅ Products in Response: ${response.data.products?.length || 0}`);
      console.log(`  ✅ Total Available: ${response.data.total || 0}\n`);
    } catch (err) {
      console.log(`  ❌ API Error: ${err.message}\n`);
    }

    // 4. Test Search with Query
    console.log('🔍 Testing Search Query...');
    try {
      const response = await axios.get(`${API_URL}/api/v1/products/getproducts?search=shirt&page=1&limit=10`);
      console.log(`  ✅ Search Results for 'shirt': ${response.data.products?.length || 0}`);
      console.log(`  ✅ Total Matching: ${response.data.total || 0}\n`);
    } catch (err) {
      console.log(`  ❌ Search Error: ${err.message}\n`);
    }

    // 5. Summary
    console.log('='.repeat(60));
    console.log('📋 DIAGNOSIS SUMMARY:');
    console.log('='.repeat(60) + '\n');

    if (productCount === 0) {
      console.log('❌ NO PRODUCTS FOUND IN DATABASE');
      console.log('\n   Solution: You need to:');
      console.log('   1. Create products via the UI, OR');
      console.log('   2. Run a seeder script to populate test data');
      console.log('   3. Import products from Excel via bulk upload\n');
    } else if (productCount - deletedCount === 0) {
      console.log('❌ ALL PRODUCTS ARE MARKED AS DELETED');
      console.log('\n   Solution: Restore products or create new ones\n');
    } else {
      console.log('✅ Products exist in database');
      console.log('   Search should work. If not:');
      console.log('   - Try the Meilisearch re-index endpoint');
      console.log('   - Check if search terms match product data\n');
    }

    await mongoose.disconnect();

  } catch (error) {
    console.error('\n❌ Debug Error:', error.message);
    process.exit(1);
  }

  console.log('='.repeat(60) + '\n');
}

debugSearch();
