/**
 * MIGRATION SCRIPT: Stock Update History Optimization
 * 
 * This script migrates from the old unbounded updateHistory array in CurrentStock
 * to the new optimized structure:
 * - Remove updateHistory from CurrentStock documents
 * - Optionally export historical data to StockMovement if needed
 * - Update lastActivity field
 * 
 * USAGE:
 * node migrate-stock-history.js [action]
 * 
 * Actions:
 * - backup: Create backup of updateHistory data
 * - export: Export updateHistory to StockMovement collection
 * - migrate: Remove updateHistory from CurrentStock
 * - all: Backup, export, then migrate
 * - dry-run: Check what will be done without making changes
 */

import mongoose from 'mongoose';
import CurrentStock from '../Models/CurrentStock.js';
import StockMovement from '../Models/StockMovement.js';
import AddProduct from '../Models/AddProduct.js';
import fs from 'fs';
import path from 'path';

const BACKUP_DIR = './migration-backups';

async function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * Backup updateHistory data from CurrentStock
 */
async function backupHistory() {
  console.log('\n📦 Starting backup of updateHistory...');

  try {
    const stocks = await CurrentStock.find({ updateHistory: { $exists: true, $ne: [] } });

    if (stocks.length === 0) {
      console.log('✅ No history found to backup');
      return;
    }

    await ensureBackupDir();

    const backup = {
      timestamp: new Date().toISOString(),
      totalDocuments: stocks.length,
      totalHistoryEntries: 0,
      data: []
    };

    for (const stock of stocks) {
      const historyCount = stock.updateHistory?.length || 0;
      backup.totalHistoryEntries += historyCount;

      backup.data.push({
        productId: stock.productId.toString(),
        historyCount,
        updateHistory: stock.updateHistory || []
      });
    }

    const filename = path.join(BACKUP_DIR, `updateHistory-backup-${Date.now()}.json`);
    fs.writeFileSync(filename, JSON.stringify(backup, null, 2));

    console.log(`✅ Backup completed`);
    console.log(`   📄 File: ${filename}`);
    console.log(`   📊 Documents: ${backup.totalDocuments}`);
    console.log(`   📝 Total history entries: ${backup.totalHistoryEntries}`);
    console.log(`   ⏱️ Average entries per product: ${(backup.totalHistoryEntries / backup.totalDocuments).toFixed(1)}`);

    return backup;

  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    throw error;
  }
}

/**
 * Export updateHistory to StockMovement collection
 * ⚠️ This is optional - only if you need complete historical records
 */
async function exportHistoryToStockMovement() {
  console.log('\n📤 Starting export of updateHistory to StockMovement...');

  try {
    const stocks = await CurrentStock.find({ updateHistory: { $exists: true, $ne: [] } });

    if (stocks.length === 0) {
      console.log('✅ No history to export');
      return;
    }

    let totalExported = 0;
    const chunkSize = 100;
    const chunks = [];

    for (const stock of stocks) {
      if (!stock.updateHistory || stock.updateHistory.length === 0) continue;

      for (const historyEntry of stock.updateHistory) {
        // Map old history format to StockMovement format
        const movement = {
          productId: stock.productId,
          batchId: null,  // Old format didn't include batch info
          movementType: getMappedMovementType(historyEntry.type),
          quantity: Math.abs(historyEntry.quantityChange),
          unitCost: 0,  // Not available in old format
          totalAmount: 0,
          reference: historyEntry.reason || 'Migrated from history',
          referenceId: historyEntry.referenceId,
          referenceType: getMappedReferenceType(historyEntry.type),
          costingMethodUsed: 'FIFO',  // Default
          documentDate: historyEntry.timestamp,
          notes: `Migrated from updateHistory on ${new Date().toISOString()}`,
          createdBy: null,
          createdAt: historyEntry.timestamp,
          updatedAt: new Date()
        };

        chunks.push(movement);
        totalExported++;

        // Insert in bulk every 1000 documents
        if (chunks.length >= chunkSize) {
          await StockMovement.insertMany(chunks, { ordered: false }).catch(err => {
            console.warn(`⚠️ Partial insert error (continuing): ${err.message}`);
          });
          chunks length = 0;
        }
      }
    }

    // Insert remaining
    if (chunks.length > 0) {
      await StockMovement.insertMany(chunks, { ordered: false }).catch(err => {
        console.warn(`⚠️ Partial insert error (continuing): ${err.message}`);
      });
    }

    console.log(`✅ Export completed`);
    console.log(`   📝 Total entries exported: ${totalExported}`);

  } catch (error) {
    console.error('❌ Export failed:', error.message);
    throw error;
  }
}

/**
 * Map old history type to StockMovement movementType
 */
function getMappedMovementType(historyType) {
  const mapping = {
    'GRN': 'INBOUND',
    'RTV': 'RETURN',
    'SALES': 'OUTBOUND',
    'SALES_RETURN': 'INBOUND',
    'ADJUSTMENT': 'ADJUSTMENT'
  };
  return mapping[historyType] || 'ADJUSTMENT';
}

/**
 * Map old history type to StockMovement referenceType
 */
function getMappedReferenceType(historyType) {
  const mapping = {
    'GRN': 'PURCHASE_ORDER',
    'RTV': 'RETURN',
    'SALES': 'SALES_INVOICE',
    'SALES_RETURN': 'SALES_INVOICE',
    'ADJUSTMENT': 'STOCK_ADJUSTMENT'
  };
  return mapping[historyType] || 'STOCK_ADJUSTMENT';
}

/**
 * Get statistics before migration
 */
async function getStats() {
  console.log('\n📊 Getting migration statistics...');

  try {
    const stats = await CurrentStock.aggregate([
      {
        $match: {
          updateHistory: { $exists: true, $type: 'array' }
        }
      },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          totalHistoryEntries: { $sum: { $size: '$updateHistory' } },
          maxHistorySize: { $max: { $size: '$updateHistory' } },
          minHistorySize: { $min: { $size: '$updateHistory' } },
          avgHistorySize: { $avg: { $size: '$updateHistory' } }
        }
      }
    ]);

    if (stats.length === 0) {
      console.log('✅ No history arrays found');
      return null;
    }

    const stat = stats[0];
    console.log(`✅ Statistics:`);
    console.log(`   📦 Total records with history: ${stat.totalRecords}`);
    console.log(`   📝 Total history entries: ${stat.totalHistoryEntries}`);
    console.log(`   📊 Average entries per product: ${stat.avgHistorySize.toFixed(1)}`);
    console.log(`   📈 Max entries per product: ${stat.maxHistorySize}`);
    console.log(`   📉 Min entries per product: ${stat.minHistorySize}`);

    return stat;

  } catch (error) {
    console.error('❌ Failed to get stats:', error.message);
    throw error;
  }
}

/**
 * Remove updateHistory field from CurrentStock
 */
async function removeHistory() {
  console.log('\n🗑️ Removing updateHistory field from CurrentStock...');

  try {
    const result = await CurrentStock.updateMany(
      { updateHistory: { $exists: true } },
      { $unset: { updateHistory: "" } }
    );

    console.log(`✅ Update completed`);
    console.log(`   🔄 Matched: ${result.matchedCount}`);
    console.log(`   ✏️ Modified: ${result.modifiedCount}`);

  } catch (error) {
    console.error('❌ Removal failed:', error.message);
    throw error;
  }
}

/**
 * Dry run - show what would be done
 */
async function dryRun() {
  console.log('\n🔍 DRY RUN - No changes will be made');
  await getStats();
  console.log('\n📋 What will happen:');
  console.log('   1. Backup of updateHistory to JSON file');
  console.log('   2. Export to StockMovement collection (optional)');
  console.log('   3. Remove updateHistory field from all CurrentStock documents');
  console.log('   4. Data will be accessible via StockMovement collection');
}

/**
 * Run migration
 */
async function migrate() {
  console.log('\n⚙️ Running migration...');

  try {
    // Get initial stats
    const initialStats = await getStats();

    if (!initialStats) {
      console.log('✅ No migration needed');
      return;
    }

    // Backup
    await backupHistory();

    // Export to StockMovement
    console.log('\n❓ Export to StockMovement? (optional but recommended)');
    console.log('   This preserves complete historical data for audit purposes');
    console.log(`   Would create ~${initialStats.totalHistoryEntries} new documents`);
    // For automated migration, set to true
    await exportHistoryToStockMovement();

    // Remove
    await removeHistory();

    console.log('\n✅ Migration completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Test queries using StockMovement collection');
    console.log('   2. Use StockHistoryManager utility for history access');
    console.log('   3. Update any code that accessed updateHistory directly');
    console.log('   4. Monitor performance improvements');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

/**
 * Main entry point
 */
async function main() {
  try {
    console.log('\n=====================================');
    console.log('📦 Stock Update History Optimization');
    console.log('=====================================');

    // Get action from command line
    const action = process.argv[2] || 'dry-run';

    console.log(`\n📌 Action: ${action}`);

    switch (action) {
      case 'stats':
        await getStats();
        break;
      case 'backup':
        await backupHistory();
        break;
      case 'export':
        await exportHistoryToStockMovement();
        break;
      case 'remove':
        await removeHistory();
        break;
      case 'migrate':
        await migrate();
        break;
      case 'all':
        await getStats();
        await backupHistory();
        await exportHistoryToStockMovement();
        await removeHistory();
        break;
      case 'dry-run':
      default:
        await dryRun();
        break;
    }

    console.log('\n✅ Done!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { backupHistory, exportHistoryToStockMovement, removeHistory, getStats };
