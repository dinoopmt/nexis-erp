/**
 * Product Meilisearch Sync Service
 * Keeps Meilisearch index in sync with MongoDB products
 */

import Product from "../../../Models/AddProduct.js";
import { indexProduct, bulkIndexProducts, deleteProductIndex } from "../../../config/meilisearch.js";

/**
 * Sync a single product to Meilisearch
 * @param {object} product - Product document
 * @returns {Promise<object>} { success, synced, taskUid, error }
 */
export const syncProductToMeilisearch = async (product, maxRetries = 3) => {
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // ✅ Populate vendor, categoryId, and packingUnits references
      const populatedProduct = await Product.findById(product._id)
        .populate('vendor', 'name')
        .populate('categoryId', 'name')
        .populate('packingUnits.unit', 'unitName unitSymbol unitDecimal category')
        .lean();

      if (!populatedProduct) {
        console.warn(`⚠️  Product not found in database: ${product._id}`);
        return { success: false, synced: false, taskUid: null, error: 'Product not found in database' };
      }

      // ✅ Index the product - NOW RETURNS OBJECT WITH taskUid
      const indexResult = await indexProduct(populatedProduct);
      
      if (!indexResult || !indexResult.success) {
        throw new Error(indexResult?.message || 'Meilisearch indexing failed');
      }

      console.log(`✅ Synced product: ${populatedProduct.name} (${populatedProduct._id}) - Task UID: ${indexResult.taskUid}`);
      return { 
        success: true, 
        synced: true, 
        taskUid: indexResult.taskUid,
        productId: populatedProduct._id 
      };
      
    } catch (err) {
      lastError = err;
      console.error(`⚠️  Attempt ${attempt}/${maxRetries} failed to sync product ${product._id}:`, err.message);
      
      // If this is not the last attempt, wait before retrying
      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt) * 100; // Exponential backoff: 200ms, 400ms, 800ms
        console.log(`⏳ Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  // All retries exhausted
  console.error(`❌ Failed to sync product ${product._id} after ${maxRetries} attempts:`, lastError?.message);
  return { success: false, synced: false, taskUid: null, error: lastError?.message || 'Unknown error' };
};

/**
 * Sync all non-deleted products to Meilisearch (bulk operation)
 * @returns {Promise<object>} { success, indexed, failed }
 */
export const syncAllProductsToMeilisearch = async () => {
  try {
    console.log('🔄 Starting bulk sync of products to Meilisearch...');

    // Fetch all non-deleted products with populated references
    const products = await Product.find({ isDeleted: false })
      .populate('vendor', 'name')
      .populate('categoryId', 'name')
      .populate('packingUnits.unit', 'unitName unitSymbol unitDecimal category')  // ✅ Populate unit references inside packingUnits
      .lean()
      .exec();

    console.log(`📦 Found ${products.length} products to index`);
    
    // Debug: Check if test product has packing units
    const testProduct = products.find(p => p.itemcode === '33338');
    if (testProduct) {
      console.log(`🔍 DEBUG B63856: Database has ${testProduct.packingUnits?.length || 0} packing units for this product`);
      if (testProduct.packingUnits?.length > 0) {
        console.log(`   First unit:`, JSON.stringify(testProduct.packingUnits[0], null, 2));
      }
    }

    if (products.length === 0) {
      return { success: true, indexed: 0, failed: 0 };
    }

    // Index in batches to avoid overwhelming Meilisearch
    const BATCH_SIZE = 500;
    let totalIndexed = 0;
    let totalFailed = 0;

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);
      console.log(`📤 Submitting batch ${Math.ceil(i / BATCH_SIZE) + 1}/${Math.ceil(products.length / BATCH_SIZE)} (${batch.length} products)...`);
      const success = await bulkIndexProducts(batch);

      if (success) {
        totalIndexed += batch.length;
        console.log(`✅ Indexed batch ${Math.ceil(i / BATCH_SIZE) + 1}/${Math.ceil(products.length / BATCH_SIZE)}`);
      } else {
        totalFailed += batch.length;
        console.error(`❌ Failed to index batch ${Math.ceil(i / BATCH_SIZE) + 1} - check server logs for details`);
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const result = {
      success: totalFailed === 0,
      indexed: totalIndexed,
      failed: totalFailed,
      message: `Synced ${totalIndexed} products, ${totalFailed} failed`
    };

    console.log(`✅ Bulk sync complete:`, result);
    return result;
  } catch (err) {
    console.error('❌ Bulk sync error:', err.message);
    return { success: false, indexed: 0, failed: -1, error: err.message };
  }
};

/**
 * Delete a product from Meilisearch
 * @param {string} productId - Product ID
 * @returns {Promise<boolean>}
 */
export const deleteProductFromMeilisearch = async (productId) => {
  try {
    const success = await deleteProductIndex(productId);
    if (success) {
      console.log(`✅ Deleted product from Meilisearch: ${productId}`);
    }
    return success;
  } catch (err) {
    console.error(`❌ Error deleting product ${productId}:`, err.message);
    return false;
  }
};

/**
 * ✅ CLEAN UP ORPHANED PRODUCTS - Remove from Meilisearch if not in database
 * Fixes issue where hard-deleted items still appear in search
 * @returns {Promise<object>} { cleaned: count, orphaned: count }
 */
export const cleanupOrphanedMeilisearchProducts = async () => {
  try {
    console.log('🧹 Starting cleanup of orphaned products in Meilisearch...');
    
    const { getClient } = await import('../../../config/meilisearch.js');
    const client = getClient();
    
    if (!client) {
      console.warn('⚠️  Meilisearch not connected');
      return { success: false, cleaned: 0, orphaned: 0 };
    }

    // Get all products from Meilisearch (paginate through all)
    const indexedProducts = [];
    let offset = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const results = await client.index('products').search('', {
        limit,
        offset,
        attributesToRetrieve: ['_id'],
      });

      if (results.hits.length === 0) {
        hasMore = false;
      } else {
        indexedProducts.push(...results.hits);
        offset += limit;
      }
    }

    console.log(`📊 Found ${indexedProducts.length} products in Meilisearch`);

    // Get all product IDs from database (including soft-deleted, we'll verify separately)
    const dbProducts = await Product.find({}, '_id isDeleted').lean();
    const dbProductIds = new Set(dbProducts.map(p => p._id.toString()));
    const dbDeletedIds = new Set(dbProducts.filter(p => p.isDeleted).map(p => p._id.toString()));

    console.log(`📦 Found ${dbProducts.length} products in database (${dbDeletedIds.size} deleted)`);

    // Find orphaned products (in Meilisearch but not in database, or soft-deleted)
    let cleanedCount = 0;
    let orphanedCount = 0;

    for (const mProduct of indexedProducts) {
      const productId = mProduct._id;
      
      // Check if product exists in database AND is not soft-deleted
      const existsInDb = dbProductIds.has(productId);
      const isDeleted = dbDeletedIds.has(productId);

      if (!existsInDb || isDeleted) {
        orphanedCount++;
        try {
          await deleteProductIndex(productId);
          cleanedCount++;
          console.log(`🗑️  Removed orphaned product: ${productId}`);
        } catch (err) {
          console.error(`❌ Failed to remove orphaned product ${productId}:`, err.message);
        }
      }
    }

    const result = {
      success: true,
      cleaned: cleanedCount,
      orphaned: orphanedCount,
      message: `✅ Cleanup complete: Removed ${cleanedCount} orphaned products (${orphanedCount} found)`,
    };

    console.log(result);
    return result;
  } catch (err) {
    console.error('❌ Cleanup error:', err.message);
    return { success: false, cleaned: 0, orphaned: 0, error: err.message };
  }
};

export default {
  syncProductToMeilisearch,
  syncAllProductsToMeilisearch,
  deleteProductFromMeilisearch,
  cleanupOrphanedMeilisearchProducts,
};
