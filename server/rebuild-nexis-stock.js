#!/usr/bin/env node

/**
 * Rebuild Current Stock from Stock Movements
 * For nexis_erp database
 * 
 * Usage: node rebuild-nexis-stock.js [productId]
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function rebuild(productId = null) {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexis_erp';
  const client = new MongoClient(mongoUri);

  try {
    console.log('🔄 Rebuilding Current Stock from Stock Movements...\n');
    await client.connect();
    const db = client.db('nexis_erp');

    console.log('✅ Connected to nexis_erp\n');

    // Get products to process
    let query = {};
    if (productId) {
      query = { 'productId._id': new (await import('mongodb')).ObjectId(productId) };
    }

    const currentStocks = await db.collection('current_stock').find(query).toArray();
    console.log(`📦 Processing ${currentStocks.length} product(s)\n`);

    let corrected = 0;
    let skipped = 0;

    for (const stock of currentStocks) {
      try {
        const prodId = stock.productId;
        console.log(`📊 Product ${prodId}:`);
        console.log(`   Current: totalQty=${stock.totalQuantity}, available=${stock.availableQuantity}`);

        // Get all movements for this product
        const movements = await db
          .collection('stock_movements')
          .find({ productId: prodId })
          .sort({ documentDate: 1, createdAt: 1 })
          .toArray();

        console.log(`   Found ${movements.length} movements`);
        
        // ⚠️ SAFETY CHECK: Don't clear stock if no movements exist
        if (movements.length === 0) {
          console.log(`   ⚠️  SKIPPED: No movements found - keeping existing stock (${stock.totalQuantity} units)`);
          console.log(`   🔍 Possible causes:`);
          console.log(`      - GRN not posted yet (stock only created on POST)`);
          console.log(`      - Movements lost in database`);
          console.log(`      - Product has no transaction history`);
          console.log('');
          skipped++;  // Track skipped products
          continue;  // SKIP to next product
        }

        // Calculate running total
        let runningTotal = 0;
        let runningCost = 0;

        movements.forEach((m, i) => {
          const qty = m.quantity || 0;
          const amount = m.totalAmount || 0;

          if (m.movementType === 'INBOUND') {
            runningTotal += qty;
            runningCost += amount;
            console.log(`     [${i + 1}] INBOUND: +${qty} units → total: ${runningTotal}`);
          } else if (m.movementType === 'OUTBOUND') {
            runningTotal -= qty;
            runningCost -= amount;
            console.log(`     [${i + 1}] OUTBOUND: -${qty} units → total: ${runningTotal}`);
          } else if (m.movementType === 'ADJUSTMENT') {
            runningTotal += qty;
            runningCost += amount;
            console.log(`     [${i + 1}] ADJUSTMENT: ${qty > 0 ? '+' : ''}${qty} units → total: ${runningTotal}`);
          }
        });

        runningTotal = Math.max(0, runningTotal);

        // Calculate availableQuantity
        const allocatedQuantity = stock.allocatedQuantity || 0;
        const damageQuality = stock.damageQuality || 0;
        const availableQuantity = Math.max(0, runningTotal - allocatedQuantity - damageQuality);

        const averageCost = runningTotal > 0 ? runningCost / runningTotal : 0;

        // Check what needs updating
        const updates = {};
        if (runningTotal !== stock.totalQuantity) {
          updates.totalQuantity = runningTotal;
          console.log(`   ⚠️  totalQuantity: ${stock.totalQuantity} → ${runningTotal}`);
        }
        if (Math.abs(averageCost - (stock.averageCost || 0)) > 0.01) {
          updates.averageCost = averageCost;
          console.log(`   ⚠️  averageCost: ${stock.averageCost || 0} → ${averageCost}`);
        }
        if (availableQuantity !== stock.availableQuantity) {
          updates.availableQuantity = availableQuantity;
          console.log(`   ⚠️  availableQuantity: ${stock.availableQuantity} → ${availableQuantity}`);
        }

        // Update if needed
        if (Object.keys(updates).length > 0) {
          await db.collection('current_stock').updateOne(
            { _id: stock._id },
            { $set: updates }
          );
          console.log(`   ✅ Updated`);
          corrected++;
        } else {
          console.log(`   ✓ Already correct`);
        }

      } catch (itemError) {
        console.error(`   ❌ Error:`, itemError.message);
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   Total Processed: ${currentStocks.length}`);
    console.log(`   Corrected: ${corrected}`);
    console.log(`   Skipped (no movements): ${skipped}`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Rebuild failed:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

const productId = process.argv[2] || null;
rebuild(productId);
