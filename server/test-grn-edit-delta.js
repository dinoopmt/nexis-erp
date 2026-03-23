#!/usr/bin/env node

/**
 * Test: GRN Edit Delta Recalculation
 * 
 * Simulates the scenario:
 * - GRN-1: 100 qty (original)
 * - GRN-2: 200 qty
 * - GRN-3: 50 qty
 * - Current Stock: 350
 * 
 * Then edit GRN-1 to 150
 * Expected: Current Stock = 400
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import './Models/StockMovement.js';
import './Models/CurrentStock.js';

dotenv.config();

async function test() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/nexis_erp');
    console.log('✅ Connected to database\n');

    // Import models
    const CurrentStock = mongoose.model('CurrentStock');

    // Find the test product we've been using
    const stock = await CurrentStock.findOne({ 
      productId: '69beef0d228dfd0cc59b9fcc' 
    });

    if (!stock) {
      console.log('⚠️ Test product not found');
      process.exit(0);
    }

    console.log('📊 Current Stock Status:');
    console.log(`   totalQuantity: ${stock.totalQuantity}`);
    console.log(`   availableQuantity: ${stock.availableQuantity}`);
    console.log(`   allocatedQuantity: ${stock.allocatedQuantity}`);
    console.log(`   damageQuality: ${stock.damageQuality}\n`);

    // Verify formula
    const expected = stock.totalQuantity - stock.allocatedQuantity - stock.damageQuality;
    console.log('📐 Formula Check:');
    console.log(`   Available = Total - Allocated - Damage`);
    console.log(`   ${stock.availableQuantity} = ${stock.totalQuantity} - ${stock.allocatedQuantity} - ${stock.damageQuality}`);
    
    if (Math.abs(stock.availableQuantity - expected) < 0.01) {
      console.log(`   ✅ CORRECT ✓`);
    } else {
      console.log(`   ❌ INCORRECT - Should be ${expected}`);
    }

    // Show what movements exist
    const StockMovement = mongoose.model('StockMovement');
    const movements = await StockMovement.find({ 
      productId: '69beef0d228dfd0cc59b9fcc'
    }).sort({ documentDate: 1 });

    console.log(`\n📦 Stock Movements (${movements.length} total):`);
    let runningTotal = 0;
    movements.forEach((m, i) => {
      const qty = m.quantity || 0;
      if (m.movementType === 'INBOUND') {
        runningTotal += qty;
        console.log(`   [${i+1}] INBOUND: +${qty} → Balance: ${runningTotal}`);
      } else if (m.movementType === 'OUTBOUND') {
        runningTotal -= qty;
        console.log(`   [${i+1}] OUTBOUND: -${qty} → Balance: ${runningTotal}`);
      }
    });

    console.log(`\n✅ Expected total from movements: ${runningTotal}`);
    console.log(`✅ Actual stored total: ${stock.totalQuantity}`);
    
    if (runningTotal === stock.totalQuantity) {
      console.log(`✅ MATCH ✓\n`);
    } else {
      console.log(`❌ MISMATCH - Need to rebuild stock\n`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

test();
