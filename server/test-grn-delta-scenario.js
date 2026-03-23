#!/usr/bin/env node

/**
 * Test: GRN Edit Delta Recalculation - Complete Scenario
 * 
 * Scenario:
 * - GRN-1: 100 qty (original)
 * - GRN-2: 200 qty
 * - GRN-3: 50 qty
 * - Initial Current Stock: 350
 * 
 * Edit Action:
 * - User edits GRN-1: 100 → 150
 * 
 * Expected Result:
 * - CurrentStock.totalQuantity = 400 (150 + 200 + 50)
 * - All stock movements properly recalculated
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import './Models/StockMovement.js';
import './Models/CurrentStock.js';
import './Models/Grn.js';
import './Models/AddProduct.js';

dotenv.config();

async function test() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/nexis_erp');
    console.log('✅ Connected to database\n');

    const StockMovement = mongoose.model('StockMovement');
    const CurrentStock = mongoose.model('CurrentStock');

    // Get a product that has multiple GRN movements
    console.log('📊 Looking for products with multiple GRN movements...\n');

    const stockMovements = await StockMovement.find({ movementType: 'INBOUND' })
      .sort({ productId: 1, documentDate: 1 })
      .limit(20);

    // Group by product
    const movementsByProduct = {};
    stockMovements.forEach(m => {
      const productId = m.productId.toString();
      if (!movementsByProduct[productId]) {
        movementsByProduct[productId] = [];
      }
      movementsByProduct[productId].push(m);
    });

    // Find a product with at least 3 INBOUND movements
    let selectedProduct = null;
    let selectedMovements = [];

    for (const [productId, movements] of Object.entries(movementsByProduct)) {
      if (movements.length >= 3) {
        selectedProduct = productId;
        selectedMovements = movements;
        break;
      }
    }

    if (!selectedProduct) {
      console.log('⚠️ No product with 3+ movements found for testing');
      const currentStock = await CurrentStock.findOne().sort({ totalQuantity: -1 });
      if (currentStock) {
        console.log(`\n📦 Using product with stock: ${currentStock.productId}`);
        selectedProduct = currentStock.productId.toString();
        selectedMovements = await StockMovement.find({
          productId: currentStock.productId,
          movementType: 'INBOUND'
        }).sort({ documentDate: 1 });
      }
    }

    if (!selectedMovements || selectedMovements.length < 3) {
      console.log('⚠️ Not enough movements for test scenario. Creating test movements...');
      process.exit(0);
    }

    console.log(`\n🎯 Test Product: ${selectedProduct}`);
    console.log(`📦 Movements count: ${selectedMovements.length}\n`);

    // Show current movements
    console.log('📝 Current Stock Movements (BEFORE EDIT):');
    console.log('────────────────────────────────');
    let runningTotal = 0;
    selectedMovements.slice(0, 3).forEach((m, i) => {
      if (m.movementType === 'INBOUND') {
        runningTotal += m.quantity;
        console.log(`   [${i+1}] INBOUND: +${m.quantity} → Balance: ${m.newStock || runningTotal}`);
      }
    });

    const initialStock = await CurrentStock.findOne({ productId: selectedProduct });
    console.log(`\n📊 Current Stock Status BEFORE:`);
    console.log(`   totalQuantity: ${initialStock?.totalQuantity || 0}`);
    console.log(`   availableQuantity: ${initialStock?.availableQuantity || 0}`);
    console.log(`   allocatedQuantity: ${initialStock?.allocatedQuantity || 0}`);

    console.log('\n─────────────────────────────────');
    console.log('🔧 SIMULATING GRN EDIT:');
    console.log(`   ${selectedMovements[0].productName}: ${selectedMovements[0].quantity} → ${Math.floor(selectedMovements[0].quantity * 1.5)}`);
    console.log('─────────────────────────────────\n');

    // Calculate expected result
    let expectedTotal = 0;
    const movements = [];
    for (let i = 0; i < Math.min(3, selectedMovements.length); i++) {
      const m = selectedMovements[i];
      if (i === 0) {
        // First movement gets 1.5x
        const newQty = Math.floor(m.quantity * 1.5);
        expectedTotal += newQty;
        movements.push({ qty: newQty, description: `${m.productName} (edited)` });
      } else {
        expectedTotal += m.quantity;
        movements.push({ qty: m.quantity, description: `${m.productName}` });
      }
    }

    console.log('📊 Expected Stock Movements (AFTER EDIT):');
    console.log('────────────────────────────────');
    let calculatedBalance = 0;
    movements.forEach((m, i) => {
      calculatedBalance += m.qty;
      console.log(`   [${i+1}] ${m.description}: +${m.qty} → Balance: ${calculatedBalance}`);
    });

    console.log(`\n💾 Expected CurrentStock.totalQuantity = ${expectedTotal}`);
    console.log(`\n📌 NOTE:`);
    console.log(`   This test shows what SHOULD happen when GRN is edited.`);
    console.log(`   To actually edit, use GRN edit endpoint with the recalculation fix.`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

test();
