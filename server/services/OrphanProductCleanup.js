/**
 * Orphan Product Cleanup Service
 * Identifies and removes products from Meilisearch that don't exist in MongoDB database
 * Runs automatically on server startup
 */

import Product from "../Models/AddProduct.js";
import { getMeilisearchClient } from "../config/meilisearch.js";

/**
 * Clean orphan products from Meilisearch
 * @returns {Promise<object>} { success, totalInMeilisearch, totalInDB, orphanRemoved, errors, timestamp }
 */
export const cleanupOrphanProducts = async () => {
  try {
    console.log('\n🔍 Starting orphan product cleanup from Meilisearch...');
    const startTime = Date.now();

    // Get Meilisearch client
    const meilisearchClient = getMeilisearchClient();
    if (!meilisearchClient) {
      console.warn('⚠️  Meilisearch not connected - cleanup skipped');
      return { 
        success: false, 
        totalInMeilisearch: 0, 
        totalInDB: 0, 
        orphanRemoved: 0,
        errors: ['Meilisearch not connected'],
        timestamp: new Date().toISOString()
      };
    }

    // Get all product IDs from MongoDB (including deleted products)
    const dbProducts = await Product.find({}, '_id').lean().exec();
    const dbProductIds = new Set(dbProducts.map(p => p._id.toString()));
    console.log(`📦 Database has ${dbProductIds.size} products (including deleted)`);

    // Get all products from Meilisearch index
    let meilisearchProducts = [];
    let hasMore = true;
    let offset = 0;
    const limit = 1000;

    while (hasMore) {
      try {
        const response = await meilisearchClient.index('products').getDocuments({
          limit,
          offset,
          fields: ['_id'],
        });

        meilisearchProducts = meilisearchProducts.concat(response.results || []);
        
        // Check if there are more documents
        if (!response.results || response.results.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      } catch (err) {
        if (err.message.includes('not found')) {
          console.log('ℹ️  Meilisearch index not found or empty');
          hasMore = false;
        } else {
          throw err;
        }
      }
    }

    console.log(`🔎 Meilisearch index has ${meilisearchProducts.length} products`);

    // Identify orphans (in Meilisearch but not in DB)
    const orphanIds = [];
    for (const meilisearchProduct of meilisearchProducts) {
      if (!dbProductIds.has(meilisearchProduct._id)) {
        orphanIds.push(meilisearchProduct._id);
      }
    }

    console.log(`🗑️  Found ${orphanIds.length} orphan products to remove`);

    // Remove orphans in batches
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    const BATCH_SIZE = 100;

    for (let i = 0; i < orphanIds.length; i += BATCH_SIZE) {
      const batch = orphanIds.slice(i, i + BATCH_SIZE);
      
      try {
        // Delete batch from Meilisearch
        for (const orphanId of batch) {
          try {
            await meilisearchClient.index('products').deleteDocument(orphanId);
            successCount++;
          } catch (deleteErr) {
            errorCount++;
            errors.push(`Failed to delete ${orphanId}: ${deleteErr.message}`);
            console.error(`❌ Error deleting orphan ${orphanId}:`, deleteErr.message);
          }
        }
        
        const progress = Math.min(i + BATCH_SIZE, orphanIds.length);
        console.log(`  ✅ Deleted batch ${Math.ceil(i / BATCH_SIZE) + 1}/${Math.ceil(orphanIds.length / BATCH_SIZE)} (${progress}/${orphanIds.length} orphans removed)`);
      } catch (batchErr) {
        console.error(`❌ Batch deletion error:`, batchErr.message);
        errorCount += batch.length;
        errors.push(`Batch error: ${batchErr.message}`);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const result = {
      success: errorCount === 0,
      totalInMeilisearch: meilisearchProducts.length,
      totalInDB: dbProductIds.size,
      orphanFound: orphanIds.length,
      orphanRemoved: successCount,
      orphanErrors: errorCount,
      errors: errors,
      duration: `${duration}s`,
      timestamp: new Date().toISOString()
    };

    if (orphanIds.length === 0) {
      console.log('✅ No orphan products found - Meilisearch index is clean');
    } else if (errorCount === 0) {
      console.log(`✅ Cleanup complete: Removed ${successCount} orphan products in ${duration}s`);
    } else {
      console.warn(`⚠️  Cleanup complete with errors: ${successCount} removed, ${errorCount} failed in ${duration}s`);
    }

    return result;
  } catch (err) {
    console.error('❌ Orphan cleanup error:', err.message);
    return {
      success: false,
      totalInMeilisearch: 0,
      totalInDB: 0,
      orphanRemoved: 0,
      errors: [err.message],
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Also provide a function to identify and export orphan IDs without deleting
 * Useful for analysis and debugging
 */
export const identifyOrphanProducts = async () => {
  try {
    console.log('🔍 Identifying orphan products...');

    const meilisearchClient = getMeilisearchClient();
    if (!meilisearchClient) {
      throw new Error('Meilisearch not connected');
    }

    // Get all product IDs from MongoDB
    const dbProducts = await Product.find({}, '_id').lean().exec();
    const dbProductIds = new Set(dbProducts.map(p => p._id.toString()));

    // Get all products from Meilisearch
    let meilisearchProducts = [];
    let hasMore = true;
    let offset = 0;
    const limit = 1000;

    while (hasMore) {
      try {
        const response = await meilisearchClient.index('products').getDocuments({
          limit,
          offset,
          fields: ['_id', 'itemcode', 'name'],
        });

        meilisearchProducts = meilisearchProducts.concat(response.results || []);
        
        if (!response.results || response.results.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      } catch (err) {
        if (err.message.includes('not found')) {
          hasMore = false;
        } else {
          throw err;
        }
      }
    }

    // Find orphans
    const orphans = [];
    for (const meilisearchProduct of meilisearchProducts) {
      if (!dbProductIds.has(meilisearchProduct._id)) {
        orphans.push({
          _id: meilisearchProduct._id,
          itemcode: meilisearchProduct.itemcode || 'N/A',
          name: meilisearchProduct.name || 'N/A'
        });
      }
    }

    console.log(`📊 Analysis: ${meilisearchProducts.length} in Meilisearch, ${dbProductIds.size} in DB, ${orphans.length} orphans`);

    return {
      totalInMeilisearch: meilisearchProducts.length,
      totalInDB: dbProductIds.size,
      orphanCount: orphans.length,
      orphans: orphans.slice(0, 50), // Return first 50 for preview
      hasMore: orphans.length > 50
    };
  } catch (err) {
    console.error('❌ Error identifying orphans:', err.message);
    throw err;
  }
};
