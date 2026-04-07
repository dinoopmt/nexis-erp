#!/usr/bin/env node

/**
 * Manual Orphan Product Cleanup Script
 * Run this script to manually identify and remove orphan products from Meilisearch
 * 
 * Usage:
 *   npm run cleanup:orphans          # Show analysis and remove orphans
 *   node scripts/cleanupOrphans.js   # Direct execution
 */

import connectDB from "../config/database.js";
import { initializeMeilisearch } from "../config/meilisearch.js";
import { cleanupOrphanProducts, identifyOrphanProducts } from "../services/OrphanProductCleanup.js";

const run = async () => {
  try {
    console.log('🚀 Starting Orphan Product Cleanup Script\n');

    // Connect to database
    console.log('📂 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Initialize Meilisearch
    console.log('🔍 Connecting to Meilisearch...');
    await initializeMeilisearch();
    console.log('✅ Connected to Meilisearch\n');

    // Show analysis
    console.log('📊 Running analysis...\n');
    const analysis = await identifyOrphanProducts();
    console.log(`Total in Meilisearch: ${analysis.totalInMeilisearch}`);
    console.log(`Total in Database: ${analysis.totalInDB}`);
    console.log(`Orphan Products Found: ${analysis.orphanCount}`);
    
    if (analysis.orphans.length > 0) {
      console.log('\n📋 Sample orphans (first 10):');
      analysis.orphans.slice(0, 10).forEach((orphan, i) => {
        console.log(`  ${i + 1}. [${orphan._id}] ${orphan.itemcode} - ${orphan.name}`);
      });
      
      if (analysis.hasMore) {
        console.log(`  ... and ${analysis.orphanCount - 10} more`);
      }
    }

    if (analysis.orphanCount > 0) {
      console.log('\n🗑️  Proceeding with cleanup...\n');
      
      // Run cleanup
      const result = await cleanupOrphanProducts();
      
      console.log('\n📊 Cleanup Summary:');
      console.log(`Duration: ${result.duration}`);
      console.log(`Orphans Removed: ${result.orphanRemoved}/${result.orphanFound}`);
      console.log(`Errors: ${result.orphanErrors}`);
      
      if (result.errors.length > 0) {
        console.log('\n⚠️  Errors:');
        result.errors.slice(0, 5).forEach(err => console.log(`  - ${err}`));
        if (result.errors.length > 5) {
          console.log(`  ... and ${result.errors.length - 5} more`);
        }
      }

      if (result.success) {
        console.log('\n✅ Cleanup completed successfully\n');
      } else {
        console.log('\n⚠️  Cleanup completed with errors\n');
      }
    } else {
      console.log('\n✅ No orphan products found - index is clean!\n');
    }

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Script error:', err.message);
    process.exit(1);
  }
};

run();
