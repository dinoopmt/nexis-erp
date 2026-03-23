#!/usr/bin/env node

/**
 * Diagnostic Script - Check Stock Data
 * 
 * Shows what's in the database and helps troubleshoot
 */

import mongoose from 'mongoose';
import CurrentStock from './Models/CurrentStock.js';
import StockMovement from './Models/StockMovement.js';
import Grn from './Models/Grn.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function diagnose() {
  try {
    console.log('🔍 Diagnostic Check\n');

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexis_erp';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Check CurrentStock
    console.log('📦 CurrentStock Collection:');
    const currentStockCount = await CurrentStock.countDocuments();
    console.log(`   Total records: ${currentStockCount}`);
    
    if (currentStockCount > 0) {
      const firstStock = await CurrentStock.findOne().lean();
      console.log(`   Sample record:`, firstStock);
    } else {
      console.log(`   ⚠️ Collection is empty!`);
    }

    // Check StockMovement
    console.log('\n📊 StockMovement Collection:');
    const movementCount = await StockMovement.countDocuments();
    console.log(`   Total records: ${movementCount}`);
    
    if (movementCount > 0) {
      const movements = await StockMovement.find().limit(3).lean();
      console.log(`   Sample records:`);
      movements.forEach((m, i) => {
        console.log(`     [${i+1}] ${m.movementType} ${m.quantity} units - Ref: ${m.reference}`);
      });
    } else {
      console.log(`   ⚠️ Collection is empty!`);
    }

    // Check GRN
    console.log('\n📋 GRN Collection:');
    const grnCount = await Grn.countDocuments();
    console.log(`   Total records: ${grnCount}`);
    
    if (grnCount > 0) {
      const grns = await Grn.find().select('grnNumber totalQty status').limit(3).lean();
      console.log(`   Sample records:`);
      grns.forEach((g, i) => {
        console.log(`     [${i+1}] ${g.grnNumber} - ${g.totalQty} units - Status: ${g.status}`);
      });
    }

    // Direct MongoDB check
    console.log('\n🔧 Direct MongoDB Collection Check:');
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`   Total collections: ${collections.length}`);
    
    const collectionNames = collections.map(c => c.name);
    console.log(`   Relevant collections found:`);
    ['current_stock', 'granitestocks', 'grns', 'stock_movements'].forEach(name => {
      if (collectionNames.includes(name)) {
        console.log(`     ✅ ${name}`);
      } else {
        console.log(`     ❌ ${name}`);
      }
    });

    process.exit(0);

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    process.exit(1);
  }
}

diagnose();
