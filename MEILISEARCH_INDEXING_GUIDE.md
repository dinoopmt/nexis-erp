# Meilisearch Client Initialization & Product Indexing Guide

## 1. MEILISEARCH CLIENT INITIALIZATION

### Configuration File: [server/config/meilisearch.js](server/config/meilisearch.js)

**Environment Variables** (in `.env`):
```
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=StrongKey123
```

**Client Initialization**:
```javascript
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
    isConnected = false;
    return null;
  }
};

export const getConnectionStatus = () => isConnected;
export const getClient = () => meilisearchClient;
```

---

## 2. SERVER INITIALIZATION & AUTO-SYNC (On Startup)

### File: [server/server.js](server/server.js#L48)

When the server starts, it automatically syncs all products to Meilisearch:

```javascript
// ✅ Initialize Meilisearch for full-text search
await initializeMeilisearch();
await setupIndex();

// ✅ Auto-sync products to Meilisearch on startup (takes ~2-5s for 50k products)
// This ensures search works fast even after server restart
console.log('🔄 Auto-syncing products to Meilisearch index after startup...');
try {
  const { syncAllProductsToMeilisearch } = await import('./modules/inventory/services/ProductMeilisearchSync.js');
  const syncResult = await syncAllProductsToMeilisearch();
  if (syncResult.success) {
    console.log(`✅ Auto-sync complete: ${syncResult.indexed} products indexed`);
  } else {
    console.warn(`⚠️  Auto-sync partial: ${syncResult.indexed} indexed, ${syncResult.failed} failed`);
  }
} catch (syncErr) {
  console.warn('⚠️  Auto-sync skipped on startup (will work on first search):', syncErr.message);
}
```

---

## 3. INDEX SETUP & CONFIGURATION

### File: [server/config/meilisearch.js](server/config/meilisearch.js#L299)

```javascript
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
      'isDeleted',  // Filter deleted products
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
```

---

## 4. PRODUCT INDEXING FUNCTIONS

### File: [server/config/meilisearch.js](server/config/meilisearch.js#L108-220)

#### A. Single Product Indexing

```javascript
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
      taxPercent: parseFloat(product.taxPercent) || 0,
      taxType: product.taxType || '',
      trackExpiry: product.trackExpiry || false,
      vendor: product.vendor?.name || product.vendor || '',
      categoryId: product.categoryId?.name || product.categoryId || '',
      unitType: product.unitType?.unitName || product.unitType || '',
      unitSymbol: product.unitSymbol || '',
      unitDecimal: product.unitDecimal || 0,
      packingUnits: product.packingUnits ? JSON.stringify(product.packingUnits) : '[]',
      isDeleted: product.isDeleted || false,
      createdate: product.createdate ? new Date(product.createdate).getTime() : Date.now(),
    }];

    await meilisearchClient.index('products').addDocuments(documents);
    return true;
  } catch (err) {
    console.error('❌ Indexing Error:', err.message);
    return false;
  }
};
```

#### B. Bulk Product Indexing

```javascript
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
        taxPercent: parseFloat(product.taxPercent) || 0,
        taxType: product.taxType || '',
        trackExpiry: product.trackExpiry || false,
        vendor: product.vendor?.name || product.vendor || '',
        categoryId: product.categoryId?.name || product.categoryId || '',
        unitType: product.unitType?.unitName || product.unitType || '',
        unitSymbol: product.unitSymbol || '',
        unitDecimal: product.unitDecimal || 0,
        packingUnits: product.packingUnits ? JSON.stringify(product.packingUnits) : '[]',
        isDeleted: product.isDeleted || false,
        createdate: product.createdate ? new Date(product.createdate).getTime() : Date.now(),
      };
      return doc;
    });

    console.log(`📝 About to index ${documents.length} documents...`);
    const response = await meilisearchClient.index('products').addDocuments(documents);
    console.log(`✅ Submitted ${documents.length} products for indexing`);
    return true;
  } catch (err) {
    console.error('❌ Bulk Indexing Error:', err.message);
    return false;
  }
};
```

#### C. Delete Product from Index

```javascript
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
```

---

## 5. PRODUCT MEILISEARCH SYNC SERVICE

### File: [server/modules/inventory/services/ProductMeilisearchSync.js](server/modules/inventory/services/ProductMeilisearchSync.js)

#### A. Sync Single Product

```javascript
export const syncProductToMeilisearch = async (product) => {
  try {
    // Populate vendor, categoryId, and packingUnits references
    const populatedProduct = await Product.findById(product._id)
      .populate('vendor', 'name')
      .populate('categoryId', 'name')
      .populate('packingUnits.unit', 'unitName unitSymbol unitDecimal category')
      .lean();

    if (populatedProduct) {
      await indexProduct(populatedProduct);
      console.log(`✅ Synced product: ${populatedProduct.name} (${populatedProduct._id})`);
      return true;
    }
    return false;
  } catch (err) {
    console.error(`❌ Error syncing product ${product._id}:`, err.message);
    return false;
  }
};
```

#### B. Sync All Products (Bulk)

```javascript
export const syncAllProductsToMeilisearch = async () => {
  try {
    console.log('🔄 Starting bulk sync of products to Meilisearch...');

    // Fetch all non-deleted products with populated references
    const products = await Product.find({ isDeleted: false })
      .populate('vendor', 'name')
      .populate('categoryId', 'name')
      .populate('packingUnits.unit', 'unitName unitSymbol unitDecimal category')
      .lean()
      .exec();

    console.log(`📦 Found ${products.length} products to index`);

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
        console.error(`❌ Failed to index batch ${Math.ceil(i / BATCH_SIZE) + 1}`);
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
```

#### C. Delete Product from Meilisearch

```javascript
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
```

#### D. Cleanup Orphaned Products

```javascript
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

    // Get all product IDs from database
    const dbProducts = await Product.find({}, '_id isDeleted').lean();
    const dbProductIds = new Set(dbProducts.map(p => p._id.toString()));
    const dbDeletedIds = new Set(dbProducts.filter(p => p.isDeleted).map(p => p._id.toString()));

    // Find orphaned products (in Meilisearch but not in database, or soft-deleted)
    let cleanedCount = 0;
    let orphanedCount = 0;

    for (const mProduct of indexedProducts) {
      const productId = mProduct._id;
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

    return {
      success: true,
      cleaned: cleanedCount,
      orphaned: orphanedCount,
      message: `✅ Cleanup complete: Removed ${cleanedCount} orphaned products (${orphanedCount} found)`,
    };
  } catch (err) {
    console.error('❌ Cleanup error:', err.message);
    return { success: false, error: err.message };
  }
};
```

---

## 6. API ENDPOINTS FOR INDEXING

### File: [server/modules/inventory/routes/productRoutes.js](server/modules/inventory/routes/productRoutes.js#L83-110)

### Endpoints:

```javascript
// Bulk sync all products to Meilisearch index
router.post("/bulk-sync-meilisearch", bulkSyncToMeilisearch);

// Complete fresh rebuild - clears old/deleted data and re-indexes from DB
router.post("/reset-sync-meilisearch", resetAndSyncMeilisearch);

// Remove products from Meilisearch that were hard-deleted from DB
router.post("/cleanup-meilisearch-orphans", cleanupMeilisearchOrphans);

// Bulk import products from Excel
router.post("/bulk-import", bulkImportProducts);

// Bulk import simple products (from external systems)
router.post("/bulk-import-simple", bulkImportSimpleProducts);
```

---

## 7. API ENDPOINT HANDLERS

### File: [server/modules/inventory/controllers/productController.js](server/modules/inventory/controllers/productController.js#L1930-2010)

#### A. Bulk Sync to Meilisearch

```javascript
export const bulkSyncToMeilisearch = async (req, res) => {
  try {
    console.log('🔄 Starting bulk sync of products to Meilisearch...');

    // Import the sync function
    const { syncAllProductsToMeilisearch } = await import("../services/ProductMeilisearchSync.js");

    // Execute bulk sync
    const result = await syncAllProductsToMeilisearch();

    res.json({
      message: result.message,
      indexed: result.indexed,
      failed: result.failed,
      success: result.success,
      error: result.error || null,
    });
  } catch (err) {
    console.error("Error in bulk sync:", err);
    res.status(500).json({
      message: "Error syncing products to Meilisearch",
      error: err.message,
    });
  }
};
```

**API Endpoint**: 
```
POST /api/v1/products/bulk-sync-meilisearch
```

#### B. Reset and Sync Meilisearch

```javascript
export const resetAndSyncMeilisearch = async (req, res) => {
  try {
    console.log('🔄 Starting complete Meilisearch reset and sync...');

    // Import required functions
    const { resetMeilisearchIndex } = await import("../../../config/meilisearch.js");
    const { syncAllProductsToMeilisearch } = await import("../services/ProductMeilisearchSync.js");

    // 1. Reset the index (delete and recreate)
    const resetSuccess = await resetMeilisearchIndex();
    if (!resetSuccess) {
      return res.status(500).json({
        message: "Failed to reset Meilisearch index",
        success: false,
      });
    }

    // 2. Re-sync all active products
    const syncResult = await syncAllProductsToMeilisearch();

    res.json({
      message: `✅ Index reset and synced successfully. ${syncResult.message}`,
      indexed: syncResult.indexed,
      failed: syncResult.failed,
      success: syncResult.success,
      error: syncResult.error || null,
    });
  } catch (err) {
    console.error("Error in reset and sync:", err);
    res.status(500).json({
      message: "Error resetting and syncing Meilisearch",
      error: err.message,
      success: false,
    });
  }
};
```

**API Endpoint**: 
```
POST /api/v1/products/reset-sync-meilisearch
```

#### C. Cleanup Orphaned Products

```javascript
export const cleanupMeilisearchOrphans = async (req, res) => {
  try {
    console.log('🧹 Starting Meilisearch orphan cleanup...');

    const { cleanupOrphanedMeilisearchProducts } = await import("../services/ProductMeilisearchSync.js");

    // Run cleanup
    const result = await cleanupOrphanedMeilisearchProducts();

    res.json({
      message: result.message,
      cleaned: result.cleaned,
      orphaned: result.orphaned,
      success: result.success,
      error: result.error || null,
    });
  } catch (err) {
    console.error("Error in cleanup:", err);
    res.status(500).json({
      message: "Error cleaning up orphaned products",
      error: err.message,
      success: false,
    });
  }
};
```

**API Endpoint**: 
```
POST /api/v1/products/cleanup-meilisearch-orphans
```

---

## 8. AUTOMATIC INDEXING TRIGGERS

### When Products are Created

**File**: [server/modules/inventory/controllers/productController.js](server/modules/inventory/controllers/productController.js#L364)

When a single product is created via the API:

```javascript
// In createProduct handler
await product.save();

// ✅ Sync product to Meilisearch index
await syncProductToMeilisearch(product);
```

### When Products are Updated

**File**: [server/modules/inventory/controllers/productController.js](server/modules/inventory/controllers/productController.js#L850)

When a product is updated:

```javascript
// In updateProduct handler
await syncProductToMeilisearch(product);
```

### When Products are Deleted

**File**: [server/modules/inventory/controllers/productController.js](server/modules/inventory/controllers/productController.js#L926)

When a product is soft-deleted:

```javascript
const meilisearchDeleted = await deleteProductFromMeilisearch(product._id);
```

### When Products are Restored

**File**: [server/modules/inventory/controllers/productController.js](server/modules/inventory/controllers/productController.js#L962)

When a deleted product is restored:

```javascript
// ✅ Re-index product in Meilisearch when restored
const meilisearchReindexed = await syncProductToMeilisearch(product);
```

---

## 9. BULK IMPORT ENDPOINTS

### Bulk Import from Excel

**API Endpoint**: 
```
POST /api/v1/products/bulk-import
```

**File**: [server/modules/inventory/controllers/productController.js](server/modules/inventory/controllers/productController.js#L1250)

- Accepts array of products from Excel
- Validates duplicates
- Creates or updates products
- **Note**: Does NOT automatically sync - requires separate `/bulk-sync-meilisearch` call after import

### Bulk Import Simple Products

**API Endpoint**: 
```
POST /api/v1/products/bulk-import-simple
```

**File**: [server/modules/inventory/controllers/productController.js](server/modules/inventory/controllers/productController.js#L1577)

- Simplified format for external systems
- Same behavior as bulk import

---

## 10. SEARCH ENDPOINT

### Search Products

**API Endpoint**: 
```
GET /api/v1/products/search?query=<search_term>&page=1&limit=100
```

**File**: [server/config/meilisearch.js](server/config/meilisearch.js#L36-105)

```javascript
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
        'taxPercent',
        'taxType',
        'trackExpiry',
        'vendor',
        'categoryId',
        'unitType',
        'unitSymbol',
        'unitDecimal',
        'packingUnits',
        'createdate',
      ],
    };

    // Filter to exclude deleted products
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
```

---

## 11. INDEXED FIELDS & DATA TRANSFORMATION

### Data Stored in Meilisearch

Each product document in Meilisearch index contains:

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `_id` | string | MongoDB _id | Unique identifier, converted to string |
| `name` | string | Product name | Searchable |
| `itemcode` | string | Item code | Searchable |
| `barcode` | string | Barcode | Searchable |
| `price` | float | Selling price | Sortable, filterable |
| `cost` | float | Cost price | Sortable, filterable |
| `stock` | number | Stock quantity | Sortable, filterable |
| `tax` | number | Tax amount | - |
| `taxPercent` | float | Tax percentage | - |
| `taxType` | string | Tax type (e.g., "VAT") | - |
| `trackExpiry` | boolean | Track expiry flag | - |
| `vendor` | string | Vendor name (denormalized from ref) | Searchable, filterable |
| `categoryId` | string | Category/Department name (denormalized) | Searchable, filterable |
| `unitType` | string | Unit name (e.g., "Kilogram") | - |
| `unitSymbol` | string | Unit symbol (e.g., "KG") | - |
| `unitDecimal` | number | Decimal places for unit | - |
| `packingUnits` | string | JSON stringified array | Parsed back on client side |
| `isDeleted` | boolean | Soft delete flag | Filterable (= false) |
| `createdate` | number | Timestamp in milliseconds | Sortable |

### Key Data Transformations:

1. **Vendor & Category References**: Stored as **vendor.name** and **categoryId.name** (denormalized strings, not ObjectIds)
2. **packingUnits**: Converted to JSON string for storage, parsed back on frontend
3. **createdate**: Converted to milliseconds for proper sorting

---

## 12. SUMMARY OF INDEXING FLOW

```
┌─────────────────────────────────────────────────────────────┐
│ SERVER STARTUP                                              │
├─────────────────────────────────────────────────────────────┤
│ 1. initializeMeilisearch() → Connect to Meilisearch server   │
│ 2. setupIndex() → Create index + configure settings         │
│ 3. syncAllProductsToMeilisearch() → Auto-sync all products  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ RUNTIME INDEXING TRIGGERS                                   │
├─────────────────────────────────────────────────────────────┤
│ • Create Product → syncProductToMeilisearch()               │
│ • Update Product → syncProductToMeilisearch()               │
│ • Delete Product → deleteProductFromMeilisearch()           │
│ • Restore Product → syncProductToMeilisearch()              │
│                                                              │
│ • Manual Bulk Sync → POST /bulk-sync-meilisearch            │
│ • Manual Reset → POST /reset-sync-meilisearch               │
│ • Cleanup Orphans → POST /cleanup-meilisearch-orphans       │
│                                                              │
│ • Bulk Import → POST /bulk-import (products created)        │
│   → Requires manual /bulk-sync-meilisearch call             │
│   → OR each product individually synced on creation         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ SEARCH                                                      │
├─────────────────────────────────────────────────────────────┤
│ GET /api/v1/products/search → Queries Meilisearch index     │
│ Returns paginated results with filters & sorting            │
└─────────────────────────────────────────────────────────────┘
```

---

## 13. KEY CONFIGURATION DETAILS

**Index Name**: `products`

**Primary Key**: `_id`

**Searchable Attributes**:
- name
- itemcode
- barcode
- vendor
- categoryId

**Sortable Attributes**:
- price
- cost
- stock
- createdate

**Filterable Attributes**:
- vendor
- categoryId
- stock
- price
- cost
- isDeleted

**Typo Tolerance**:
- Enabled: true
- 1 typo for words ≥ 5 chars
- 2 typos for words ≥ 9 chars

**Max Total Hits**: 10,000

---

## 14. FILES LOCATION REFERENCE

- **🔧 Configuration**: [server/config/meilisearch.js](server/config/meilisearch.js)
- **🔄 Sync Service**: [server/modules/inventory/services/ProductMeilisearchSync.js](server/modules/inventory/services/ProductMeilisearchSync.js)
- **🛣️ Routes**: [server/modules/inventory/routes/productRoutes.js](server/modules/inventory/routes/productRoutes.js)
- **🎮 Controllers**: [server/modules/inventory/controllers/productController.js](server/modules/inventory/controllers/productController.js) (lines 1250, 1577, 1930, 1960)
- **🚀 Server Init**: [server/server.js](server/server.js) (lines 10, 48-58)
- **⚙️ Environment**: [server/.env](server/.env)

