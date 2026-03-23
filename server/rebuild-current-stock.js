#!/usr/bin/env node

/**
 * Quick Stock Rebuild Script
 * 
 * Usage: node rebuild-current-stock.js
 * Purpose: Recalculate availableQuantity for all products in current_stock
 * 
 * Formula: availableQuantity = totalQuantity - allocatedQuantity - damageQuality
 */

import mongoose from 'mongoose';
import CurrentStock from './Models/CurrentStock.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function rebuildCurrentStock() {
  try {
    console.log('🔧 Starting Current Stock Rebuild...\n');

    // Connect to DB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexis_erp';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get all current stock records
    const allStocks = await CurrentStock.find({});
    console.log(`📊 Found ${allStocks.length} product stocks to process\n`);

    let corrected = 0;
    let errors = 0;

    for (const stock of allStocks) {
      try {
        // Calculate correct availableQuantity
        const correctedAvailable = Math.max(
          0,
          stock.totalQuantity - stock.allocatedQuantity - stock.damageQuality
        );

        // If different, update
        if (correctedAvailable !== stock.availableQuantity) {
          const oldValue = stock.availableQuantity;

          await CurrentStock.updateOne(
            { _id: stock._id },
            { $set: { availableQuantity: correctedAvailable } }
          );

          corrected++;

          console.log(
            `   ✅ Product ${stock.productId}: ${oldValue} → ${correctedAvailable} ` +
            `(formula: ${stock.totalQuantity} - ${stock.allocatedQuantity} - ${stock.damageQuality})`
          );
        }

      } catch (itemError) {
        errors++;
        console.error(`   ❌ Error updating product ${stock.productId}:`, itemError.message);
      }
    }

    console.log(`\n📈 Rebuild Summary:`);
    console.log(`   Total Processed: ${allStocks.length}`);
    console.log(`   Corrected: ${corrected}`);
    console.log(`   Errors: ${errors}`);
    console.log(`\n✅ Rebuild complete!\n`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Rebuild failed:', error);
    process.exit(1);
  }
}

rebuildCurrentStock();
