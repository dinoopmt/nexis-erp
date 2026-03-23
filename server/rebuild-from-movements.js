#!/usr/bin/env node

/**
 * Stock Movement Rebuild Script
 * 
 * Rebuilds current_stock from complete transaction history in StockMovement
 * 
 * Usage: node rebuild-from-movements.js [productId]
 * Example: node rebuild-from-movements.js 69beef0d228dfd0cc59b9fcc
 */

import mongoose from 'mongoose';
import CurrentStock from './Models/CurrentStock.js';
import StockMovement from './Models/StockMovement.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function rebuildFromMovements(productId = null) {
  try {
    console.log('🔄 Rebuilding Current Stock from StockMovement History...\n');

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexis_erp';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // If productId provided, filter only that product
    const filter = productId ? { productId } : {};

    // Get all current stocks to process
    const stocks = await CurrentStock.find(filter);
    console.log(`📊 Processing ${stocks.length} product(s)\n`);

    let rebuilt = 0;
    let errors = 0;

    for (const stock of stocks) {
      try {
        console.log(`\n📦 Product: ${stock.productId}`);
        console.log(`   Current: totalQty=${stock.totalQuantity}, available=${stock.availableQuantity}`);

        // Get all movements for this product, sorted chronologically
        const movements = await StockMovement.find({ productId: stock.productId })
          .sort({ documentDate: 1, createdAt: 1 })
          .lean();

        console.log(`   Found ${movements.length} movements`);

        // Rebuild from transactions
        let runningTotal = 0;
        let runningCost = 0;

        if (movements.length > 0) {
          for (const movement of movements) {
            const qty = movement.quantity || 0;
            const amount = movement.totalAmount || 0;

            if (movement.movementType === 'INBOUND') {
              runningTotal += qty;
              runningCost += amount;
            } else if (movement.movementType === 'OUTBOUND') {
              runningTotal -= qty;
              runningCost -= amount;
            } else if (movement.movementType === 'ADJUSTMENT') {
              runningTotal += qty;  // Can be positive or negative
              runningCost += amount;
            }

            if (movements.length <= 5) {
              console.log(`     ${movement.movementType}: ${qty} units → running total: ${runningTotal}`);
            }
          }
        }

        runningTotal = Math.max(0, runningTotal);
        const averageCost = runningTotal > 0 ? runningCost / runningTotal : 0;

        // Calculate availableQuantity
        const availableQuantity = Math.max(
          0,
          runningTotal - stock.allocatedQuantity - stock.damageQuality
        );

        // Update if different
        const updates = {};
        if (runningTotal !== stock.totalQuantity) {
          updates.totalQuantity = runningTotal;
          console.log(`   ⚠️  totalQuantity: ${stock.totalQuantity} → ${runningTotal}`);
        }
        if (averageCost !== stock.averageCost) {
          updates.averageCost = averageCost;
          console.log(`   ⚠️  averageCost: ${stock.averageCost} → ${averageCost}`);
        }
        if (availableQuantity !== stock.availableQuantity) {
          updates.availableQuantity = availableQuantity;
          console.log(`   ⚠️  availableQuantity: ${stock.availableQuantity} → ${availableQuantity}`);
        }

        if (Object.keys(updates).length > 0) {
          await CurrentStock.updateOne({ _id: stock._id }, { $set: updates });
          console.log(`   ✅ Updated`);
          rebuilt++;
        } else {
          console.log(`   ✓ Already correct`);
        }

      } catch (itemError) {
        errors++;
        console.error(`   ❌ Error:`, itemError.message);
      }
    }

    console.log(`\n📈 Rebuild Summary:`);
    console.log(`   Total Processed: ${stocks.length}`);
    console.log(`   Rebuilt: ${rebuilt}`);
    console.log(`   Errors: ${errors}`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Rebuild failed:', error);
    process.exit(1);
  }
}

const productId = process.argv[2] || null;
rebuildFromMovements(productId);
