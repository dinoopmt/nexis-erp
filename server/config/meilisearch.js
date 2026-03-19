/**
 * Meilisearch Configuration
 * Handles search indexing and querying for products
 */

import { MeiliSearch } from 'meilisearch';

let meilisearchClient = null;
let isConnected = false;

const initializeMeilisearch = async () => {
  try {
    const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST || 'http://localhost:7700';
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
        'cost',
        'stock',
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
 * @param {object} product - Product document
 */
const indexProduct = async (product) => {
  if (!meilisearchClient || !isConnected) {
    console.warn('⚠️  Meilisearch not connected - skipping index');
    return false;
  }

  try {
    const documents = [{
      _id: product._id.toString(),
      name: product.name,
      itemcode: product.itemcode,
      barcode: product.barcode || '',
      price: parseFloat(product.price) || 0,
      cost: parseFloat(product.cost) || 0,
      stock: product.stock || 0,
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
      createdate: product.createdate ? new Date(product.createdate).getTime() : Date.now(),
    }];

    await meilisearchClient.index('products').addDocuments(documents);
    return true;
  } catch (err) {
    console.error('❌ Indexing Error:', err.message);
    return false;
  }
};

/**
 * Bulk add/update products in Meilisearch index
 * @param {array} products - Array of product documents
 */
const bulkIndexProducts = async (products) => {
  if (!meilisearchClient || !isConnected) {
    console.warn('⚠️  Meilisearch not connected - skipping bulk index');
    return false;
  }

  try {
    const documents = products.map((product) => {
      const doc = {
        _id: product._id.toString(),
        name: product.name,
        itemcode: product.itemcode,
        barcode: product.barcode || '',
        price: parseFloat(product.price) || 0,
        cost: parseFloat(product.cost) || 0,
        stock: product.stock || 0,
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
        createdate: product.createdate ? new Date(product.createdate).getTime() : Date.now(),
      };
      
      // Debug: Log if this is the test product
      if (product.itemcode === '33338' && product.packingUnits?.length > 0) {
        console.log(`🔍 DEBUG B63856: Found ${product.packingUnits.length} packing units`);
      }
      
      return doc;
    });

    console.log(`📝 About to index ${documents.length} documents...`);
    const response = await meilisearchClient.index('products').addDocuments(documents);
    console.log(`📬 Response from addDocuments:`, typeof response, response instanceof Object ? 'Task object' : response);
    console.log(`✅ Submitted ${documents.length} products for indexing`);
    return true;
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
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      if (!err.message.includes('not found')) {
        console.error('❌ Error deleting index:', err.message);
        throw err;
      }
      console.log('ℹ️  Index did not exist, creating new one');
    }

    // 2. Create fresh index
    await meilisearchClient.createIndex('products', { primaryKey: '_id' });
    console.log('✅ Created fresh products index');

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
 */
const setupIndex = async () => {
  if (!meilisearchClient || !isConnected) {
    console.warn('⚠️  Meilisearch not connected - cannot setup index');
    return false;
  }

  try {
    // Try to create index if it doesn't exist
    try {
      await meilisearchClient.createIndex('products', { primaryKey: '_id' });
      console.log('✅ Created Meilisearch products index');
    } catch (err) {
      // Index likely already exists
      console.log('ℹ️  Products index already exists');
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

export {
  initializeMeilisearch,
  searchProducts,
  indexProduct,
  bulkIndexProducts,
  deleteProductIndex,
  setupIndex,
  resetMeilisearchIndex,
};

export const getConnectionStatus = () => isConnected;
export const getClient = () => meilisearchClient;
