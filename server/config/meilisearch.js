/**
 * Meilisearch Configuration
 * Handles search indexing and querying for products
 */

import { MeiliSearch } from 'meilisearch';
import CurrentStock from '../Models/CurrentStock.js';

let meilisearchClient = null;
let isConnected = false;

const initializeMeilisearch = async () => {
  try {
    const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST || 'http://127.0.0.1:7700';
    const MEILISEARCH_API_KEY = process.env.MEILISEARCH_API_KEY || '';

    meilisearchClient = new MeiliSearch({
      host: MEILISEARCH_HOST,
      apiKey: MEILISEARCH_API_KEY,
    });

    // Test connection by getting version
    const version = await meilisearchClient.getVersion();
    console.log('✅ Meilisearch Connected - Version:', version.version);
    isConnected = true;
    
    return meilisearchClient;
  } catch (err) {
    console.error('❌ Meilisearch Connection Failed:', err.message);
    console.log('⚠️  Make sure Meilisearch is running on http://localhost:7700');
    isConnected = false;
    return null;
  }
};

/**
 * Search products in Meilisearch
 * @param {string} query - Search query
 * @param {object} options - Search options { page, limit, filters, sort }
 * @returns {Promise<object>} Search results
 */
const searchProducts = async (query, options = {}) => {
  if (!meilisearchClient || !isConnected) {
    throw new Error('Meilisearch client not initialized');
  }

  try {
    const {
      page = 1,
      limit = 100,
      filters = '',
      sort = ['createdate:desc'],
    } = options;

    const offset = (page - 1) * limit;

    const searchParams = {
      limit,
      offset,
      sort,
      attributesToRetrieve: [
        '_id',
        'name',
        'itemcode',
        'barcode',
        'price',
        'finalPrice',  // ✅ ADDED - Final price including tax
        'cost',
        'stock',
        'currentStock',  // ✅ ADDED - CurrentStock object with availableQuantity, totalQuantity
        'tax',
        'taxPercent',  // ✅ ADDED - Tax percentage for GRN
        'taxType',     // ✅ ADDED - Tax type for GRN
        'trackExpiry', // ✅ ADDED - Track expiry for batch management in GRN
        'vendor',
        'categoryId',
        'unitType',
        'unitSymbol',
        'unitDecimal',
        'packingUnits',  // ✅ ADDED - For unit variant selection
        'image',        // ✅ ADDED - Product image (base64) for display in Quotation
        'imagePath',    // ✅ ADDED - Product image file path for display in Quotation
        'createdate',
      ],
    };

    // ✅ Filter to exclude deleted products
    const filterArray = ['isDeleted = false'];
    if (filters) {
      filterArray.push(filters);
    }
    searchParams.filter = [filterArray];

    const results = await meilisearchClient.index('products').search(query, searchParams);

    // 🔍 DEBUG: Log what MeiliSearch returned
    if (results.hits.length > 0) {
      console.log('🔍 MeiliSearch result sample (first product):', JSON.stringify(results.hits[0], null, 2));
      console.log('🔍 imagePath in first result:', results.hits[0].imagePath);
    }

    return {
      products: results.hits,
      totalCount: results.estimatedTotalHits || results.hits.length,
      page,
      pageSize: limit,
      totalPages: Math.ceil((results.estimatedTotalHits || results.hits.length) / limit),
      resultCount: results.hits.length,
      hasNextPage: page < Math.ceil((results.estimatedTotalHits || results.hits.length) / limit),
      hasPrevPage: page > 1,
    };
  } catch (err) {
    console.error('❌ Search Error:', err.message);
    throw err;
  }
};

/**
 * Add or update a product in Meilisearch index
 * ✅ NOW WAITS FOR TASK COMPLETION - Ensures document is indexed before returning
 * @param {object} product - Product document
 * @returns {object} - Returns { success: true/false, taskUid: number, message: string }
 */
const indexProduct = async (product) => {
  if (!meilisearchClient || !isConnected) {
    console.warn('⚠️  Meilisearch not connected - skipping index');
    return { success: false, taskUid: null, message: 'Meilisearch not connected' };
  }

  try {
    // ✅ Fetch CurrentStock for this product
    const currentStock = await CurrentStock.findOne({
      productId: product._id,
      isDeleted: { $ne: true }
    }).lean();

    const documents = [{
      _id: product._id.toString(),
      name: product.name,
      itemcode: product.itemcode,
      barcode: product.barcode || '',
      price: parseFloat(product.price) || 0,
      finalPrice: parseFloat(product.finalPrice) || 0,  // ✅ ADDED - Final price including tax
      cost: parseFloat(product.cost) || 0,
      stock: product.stock || 0,
      currentStock: currentStock ? {
        totalQuantity: currentStock.totalQuantity || 0,
        availableQuantity: currentStock.availableQuantity || 0,
        allocatedQuantity: currentStock.allocatedQuantity || 0,
        grnReceivedQuantity: currentStock.grnReceivedQuantity || 0
      } : null,  // ✅ ADDED - Include CurrentStock object
      tax: product.tax || 0,
      taxPercent: parseFloat(product.taxPercent) || 0,  // ✅ ADDED - Tax percentage from product
      taxType: product.taxType || '',  // ✅ ADDED - Tax type from product
      trackExpiry: product.trackExpiry || false,  // ✅ ADDED - Track expiry for batch management in GRN
      vendor: product.vendor?.name || product.vendor || '',
      categoryId: product.categoryId?.name || product.categoryId || '',
      unitType: product.unitType?.unitName || product.unitType || '',
      unitSymbol: product.unitSymbol || '',
      unitDecimal: product.unitDecimal || 0,
      packingUnits: product.packingUnits ? JSON.stringify(product.packingUnits) : '[]',  // ✅ Stringify for Meilisearch
      isDeleted: product.isDeleted || false,  // ✅ ADDED - Track deleted status
      image: product.image || null,  // ✅ ADDED - Product image (base64) for display in Quotation
      imagePath: product.imagePath || null,  // ✅ ADDED - Product image file path for display in Quotation
      createdate: product.createdate ? new Date(product.createdate).getTime() : Date.now(),
    }];

    // ✅ Add document and capture task
    const task = await meilisearchClient.index('products').addDocuments(documents);
    
    // ✅ DEBUG: Log the actual response structure
    console.log('📬 Task response type:', typeof task);
    console.log('📬 Task response keys:', task ? Object.keys(task) : 'null');
    
    // ✅ Handle both possible property names (uid or taskUid)
    const taskUid = task?.taskUid ?? task?.uid;
    
    if (!task || typeof taskUid !== 'number') {
      console.warn('⚠️  No taskUid in response:', task);
      return { 
        success: true, 
        taskUid: null, 
        message: 'Document submitted but no task tracking'
      };
    }

    // ✅ CRITICAL FIX: Use tasks.waitForTask() to wait for completion
    // This ensures the product is actually indexed
    console.log(`⏳ Waiting for Meilisearch task ${taskUid} to complete...`);
    const completedTask = await meilisearchClient.tasks.waitForTask(taskUid, {
      timeoutMs: 10000, // 10 second timeout
      intervalMs: 250,  // Check every 250ms
    });

    if (completedTask.status === 'succeeded') {
      console.log(`✅ Indexed product: ${product.name} (${product._id}) - Task UID: ${taskUid}`);
      return { 
        success: true, 
        taskUid: taskUid, 
        message: 'Document successfully indexed'
      };
    } else if (completedTask.status === 'failed') {
      console.error(`❌ Failed to index product ${product._id}:`, completedTask.error);
      return { 
        success: false, 
        taskUid: taskUid, 
        message: `Indexing failed: ${completedTask.error?.message || 'Unknown error'}`
      };
    } else {
      console.warn(`⚠️  Task ${taskUid} ended with status: ${completedTask.status}`);
      return { 
        success: completedTask.status === 'succeeded', 
        taskUid: taskUid, 
        message: `Task status: ${completedTask.status}`
      };
    }
  } catch (err) {
    console.error('❌ Indexing Error:', err.message);
    return { 
      success: false, 
      taskUid: null, 
      message: err.message 
    };
  }
};

/**
 * Bulk add/update products in Meilisearch index
 * ✅ NOW WAITS FOR TASK COMPLETION - Ensures documents are indexed before returning
 * @param {array} products - Array of product documents
 */
const bulkIndexProducts = async (products) => {
  if (!meilisearchClient || !isConnected) {
    console.warn('⚠️  Meilisearch not connected - skipping bulk index');
    return false;
  }

  try {
    // ✅ Fetch all CurrentStock records for these products in one query
    const productIds = products.map(p => p._id);
    const currentStocks = await CurrentStock.find({
      productId: { $in: productIds },
      isDeleted: { $ne: true }
    }).lean();

    // Create a Map for O(1) lookup
    const stockMap = new Map();
    currentStocks.forEach(stock => {
      stockMap.set(stock.productId.toString(), stock);
    });

    const documents = products.map((product) => {
      // ✅ Get CurrentStock for this product
      const currentStock = stockMap.get(product._id.toString());

      const doc = {
        _id: product._id.toString(),
        name: product.name,
        itemcode: product.itemcode,
        barcode: product.barcode || '',
        price: parseFloat(product.price) || 0,
        cost: parseFloat(product.cost) || 0,
        stock: product.stock || 0,
        currentStock: currentStock ? {
          totalQuantity: currentStock.totalQuantity || 0,
          availableQuantity: currentStock.availableQuantity || 0,
          allocatedQuantity: currentStock.allocatedQuantity || 0,
          grnReceivedQuantity: currentStock.grnReceivedQuantity || 0
        } : null,  // ✅ ADDED - Include CurrentStock object
        tax: product.tax || 0,
        taxPercent: parseFloat(product.taxPercent) || 0,  // ✅ ADDED - Tax percentage from product
        taxType: product.taxType || '',  // ✅ ADDED - Tax type from product
        trackExpiry: product.trackExpiry || false,  // ✅ ADDED - Track expiry for batch management in GRN
        vendor: product.vendor?.name || product.vendor || '',
        categoryId: product.categoryId?.name || product.categoryId || '',
        unitType: product.unitType?.unitName || product.unitType || '',
        unitSymbol: product.unitSymbol || '',
        unitDecimal: product.unitDecimal || 0,
        packingUnits: product.packingUnits ? JSON.stringify(product.packingUnits) : '[]',  // ✅ Stringify for Meilisearch
        isDeleted: product.isDeleted || false,  // ✅ ADDED - Track deleted status
        image: product.image || null,  // ✅ ADDED - Product image (base64) for display in Quotation
        imagePath: product.imagePath || null,  // ✅ ADDED - Product image file path for display in Quotation
        createdate: product.createdate ? new Date(product.createdate).getTime() : Date.now(),
      };
      
      // Debug: Log if this is the test product
      if (product.itemcode === '33338' && product.packingUnits?.length > 0) {
        console.log(`🔍 DEBUG B63856: Found ${product.packingUnits.length} packing units`);
      }
      
      return doc;
    });

    console.log(`📝 About to index ${documents.length} documents...`);
    
    // Debug: Log imagePath from first few documents
    console.log(`🔍 DEBUG imagePath in documents being indexed:`);
    for (let i = 0; i < Math.min(3, documents.length); i++) {
      console.log(`   Doc ${i+1} (${documents[i].name}): imagePath = ${documents[i].imagePath}`);
    }
    
    const task = await meilisearchClient.index('products').addDocuments(documents);
    
    // ✅ DEBUG: Log the actual response structure
    console.log('📬 Task response type:', typeof task);
    console.log('📬 Task response keys:', task ? Object.keys(task) : 'null');
    console.log('📬 Full task response:', JSON.stringify(task, null, 2));
    
    // ✅ Handle both possible property names (uid or taskUid)
    const taskUid = task?.taskUid ?? task?.uid;
    
    if (!task || typeof taskUid !== 'number') {
      console.error('❌ No task UID returned from Meilisearch - task:', task);
      return false;
    }

    // ✅ CRITICAL FIX: Use tasks.waitForTask() to wait for completion
    // This ensures documents are actually indexed before we return success
    console.log(`⏳ Waiting for Meilisearch task ${taskUid} to complete...`);
    const completedTask = await meilisearchClient.tasks.waitForTask(taskUid, {
      timeoutMs: 30000, // 30 second timeout
      intervalMs: 500,  // Check every 500ms
    });

    if (completedTask.status === 'succeeded') {
      console.log(`✅ Task ${taskUid} completed successfully - ${documents.length} products indexed`);
      return true;
    } else if (completedTask.status === 'failed') {
      console.error(`❌ Task ${taskUid} failed:`, completedTask.error);
      return false;
    } else {
      console.warn(`⚠️  Task ${taskUid} ended with status: ${completedTask.status}`);
      return completedTask.status === 'succeeded';
    }
  } catch (err) {
    console.error('❌ Bulk Indexing Error Type:', err.constructor.name);
    console.error('❌ Bulk Indexing Error Message:', err.message);
    console.error('❌ Bulk Indexing Error Stack:', err.stack);
    return false;
  }
};

/**
 * Delete a product from Meilisearch index
 * @param {string} productId - Product ID
 */
const deleteProductIndex = async (productId) => {
  if (!meilisearchClient || !isConnected) {
    console.warn('⚠️  Meilisearch not connected - skipping delete');
    return false;
  }

  try {
    await meilisearchClient.index('products').deleteDocument(productId.toString());
    return true;
  } catch (err) {
    console.error('❌ Delete Index Error:', err.message);
    return false;
  }
};

/**
 * ✅ COMPLETELY RESET the products index - Delete and recreate fresh
 */
const resetMeilisearchIndex = async () => {
  if (!meilisearchClient || !isConnected) {
    console.warn('⚠️  Meilisearch not connected - cannot reset index');
    return false;
  }

  try {
    // 1. Delete the entire index
    try {
      await meilisearchClient.deleteIndex('products');
      console.log('🗑️  Deleted products index');
      
      // Wait for deletion to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      if (!err.message?.includes('not found') && !err.code?.includes('index_not_found')) {
        console.error('❌ Error deleting index:', err.message);
        throw err;
      }
      console.log('ℹ️  Index did not exist, creating new one');
    }

    // 2. Create fresh index with explicit primaryKey
    console.log('📝 Creating fresh index with primaryKey: _id...');
    await meilisearchClient.createIndex('products', { primaryKey: '_id' });
    console.log('✅ Created fresh products index');

    // Wait for creation to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // 3. Configure the new index
    const index = meilisearchClient.index('products');
    
    await index.updateSearchableAttributes([
      'name',
      'itemcode',
      'barcode',
      'vendor',
      'categoryId',
    ]);

    await index.updateSortableAttributes([
      'price',
      'cost',
      'stock',
      'createdate',
    ]);

    await index.updateFilterableAttributes([
      'vendor',
      'categoryId',
      'stock',
      'price',
      'cost',
      'isDeleted',
    ]);

    await index.updateSettings({
      typoTolerance: {
        enabled: true,
        minWordSizeForTypos: {
          oneTypo: 5,
          twoTypos: 9,
        },
      },
      pagination: {
        maxTotalHits: 10000,
      },
    });

    console.log('✅ Index reset and configured successfully');
    return true;
  } catch (err) {
    console.error('❌ Index Reset Error:', err.message);
    return false;
  }
};

/**
 * Initialize Meilisearch index with settings
 * ✅ FIXED: Ensures primaryKey is always set to '_id' - DELETES AND RECREATES if needed
 */
const setupIndex = async () => {
  if (!meilisearchClient || !isConnected) {
    console.warn('⚠️  Meilisearch not connected - cannot setup index');
    return false;
  }

  try {
    let indexExists = false;
    let needsRecreate = false;
    
    // Check if index exists
    try {
      const indexInfo = await meilisearchClient.getIndex('products');
      indexExists = true;
      
      // If index exists but has no primary key, we MUST delete and recreate
      if (!indexInfo.primaryKey || indexInfo.primaryKey === null) {
        console.log('⚠️  Index exists but has NO primary key - will delete and recreate');
        needsRecreate = true;
      } else {
        console.log(`ℹ️  Index exists with primaryKey: ${indexInfo.primaryKey}`);
      }
    } catch (err) {
      if (err.code === 'index_not_found' || err.message?.includes('not found')) {
        console.log('ℹ️  Index does not exist - will create fresh');
        indexExists = false;
      } else {
        throw err;
      }
    }

    // Delete old index if it has no primary key
    if (needsRecreate) {
      console.log('🗑️  Deleting old index without primaryKey...');
      try {
        await meilisearchClient.deleteIndex('products');
        console.log('✅ Deleted old index');
        // Wait for deletion to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        indexExists = false;
      } catch (deleteErr) {
        console.error('❌ Error deleting index:', deleteErr.message);
        throw deleteErr;
      }
    }

    // Create index if it doesn't exist
    if (!indexExists) {
      console.log('📝 Creating fresh index with primaryKey: _id...');
      try {
        await meilisearchClient.createIndex('products', { primaryKey: '_id' });
        console.log('✅ Created Meilisearch products index with primaryKey: _id');
      } catch (createErr) {
        console.error('❌ Error creating index:', createErr.message);
        throw createErr;
      }
    }

    const index = meilisearchClient.index('products');

    // Configure searchable attributes
    await index.updateSearchableAttributes([
      'name',
      'itemcode',
      'barcode',
      'vendor',
      'categoryId',
    ]);

    // Configure sortable attributes
    await index.updateSortableAttributes([
      'price',
      'cost',
      'stock',
      'createdate',
    ]);

    // Configure filterable attributes
    await index.updateFilterableAttributes([
      'vendor',
      'categoryId',
      'stock',
      'price',
      'cost',
      'isDeleted',  // ✅ ADDED - Filter deleted products
    ]);

    // ✅ Configure displayed attributes - include image field so it's returned in search results
    await index.updateDisplayedAttributes([
      '_id',
      'name',
      'itemcode',
      'barcode',
      'price',
      'finalPrice',
      'cost',
      'stock',
      'currentStock',
      'tax',
      'taxPercent',
      'taxType',
      'trackExpiry',
      'vendor',
      'categoryId',
      'unitType',
      'unitSymbol',
      'unitDecimal',
      'packingUnits',
      'isDeleted',
      'image',  // ✅ Product image (base64) now returned in search results
      'imagePath',  // ✅ ADDED - Product image file path for display in Quotation
      'createdate',
    ]);

    // Set typo tolerance
    await index.updateSettings({
      typoTolerance: {
        enabled: true,
        minWordSizeForTypos: {
          oneTypo: 5,
          twoTypos: 9,
        },
      },
      pagination: {
        maxTotalHits: 10000,
      },
    });

    console.log('✅ Meilisearch index configured successfully');
    return true;
  } catch (err) {
    console.error('❌ Index Setup Error:', err.message);
    return false;
  }
};

/**
 * Get the status of a Meilisearch task
 * @param {number} taskUid - Task UID returned from indexed products
 * @returns {Promise<object>} - Task status { uid, status, type, indexUid, ... }
 */
const getTaskStatus = async (taskUid) => {
  if (!meilisearchClient || !isConnected) {
    throw new Error('Meilisearch not connected');
  }
  
  if (typeof taskUid !== 'number') {
    throw new Error('Invalid taskUid - must be a number');
  }
  
  try {
    const task = await meilisearchClient.getTask(taskUid);
    console.log(`📊 Task ${taskUid} status: ${task.status}`);
    return task;
  } catch (err) {
    console.error(`❌ Failed to get task status for ${taskUid}:`, err.message);
    throw err;
  }
};

export {
  initializeMeilisearch,
  searchProducts,
  indexProduct,
  bulkIndexProducts,
  deleteProductIndex,
  setupIndex,
  resetMeilisearchIndex,
  getTaskStatus,
};

export const getConnectionStatus = () => isConnected;
export const getClient = () => meilisearchClient;
export const getMeilisearchClient = () => meilisearchClient;
