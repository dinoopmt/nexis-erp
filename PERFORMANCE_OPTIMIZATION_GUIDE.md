# Performance Optimization & Testing Guide

## Overview

This guide covers comprehensive performance optimizations and testing strategies for the NEXIS-ERP product management system to handle high-volume data entry (100k+ products) and multi-user concurrent operations.

---

## Table of Contents

1. [Multi-User Concurrent Testing](#multi-user-concurrent-testing)
2. [Performance Monitoring](#performance-monitoring)
3. [Database Optimization](#database-optimization)
4. [Validation Enhancements](#validation-enhancements)
5. [Client-Side Caching](#client-side-caching)
6. [UI/UX Enhancements](#uiux-enhancements)
7. [Testing Checklist](#testing-checklist)

---

## Multi-User Concurrent Testing

### Load Test Script

The load test simulates multiple users creating products concurrently to verify:
- ✅ No duplicate item codes are generated
- ✅ FIFO fairness (first request gets first code)
- ✅ Server stability under load
- ✅ Response times and throughput

### Running the Load Test

```bash
# Terminal 1: Start MongoDB
mongod

# Terminal 2: Start Express server
cd .\server\
npm run dev

# Terminal 3: Run load test
node tests/loadTest.js
```

### Load Test Output Examples

```
╔═══════════════════════════════════════════════════════════════╗
║   CONCURRENT LOAD TEST FOR ITEM CODE GENERATION              ║
╚═══════════════════════════════════════════════════════════════╝

Test Configuration:
  • Concurrent Users: 10
  • Products per User: 5
  • Total Requests: 50
  • API Base URL: http://localhost:5000

📊 LOAD TEST RESULTS
═══════════════════════════════════════════════════════════════

✓ Total Requests: 50
✓ Successful: 50
✗ Failed: 0
  Success Rate: 100.00%

✅ DUPLICATE CHECK: PASSED - No duplicate item codes found

✅ FIFO ORDER: PASSED - Codes assigned in request order

⏱️  RESPONSE TIME METRICS:
   • Average Response: 125.43ms
   • Min Response: 87.12ms
   • Max Response: 312.54ms
   • P95 Response: 275.81ms
   • P99 Response: 310.92ms
   • Throughput: 45.23 requests/sec

✅ DATABASE CONSISTENCY: PASSED
```

### Interpreting Results

| Metric | Target | Status |
|--------|--------|--------|
| Duplicate Item Codes | 0 | Must be zero ✅ |
| Success Rate | > 99% | Check percentage |
| Avg Response | < 200ms | Faster is better |
| P95 Response | < 500ms | 95% of requests |
| P99 Response | < 1000ms | 99% of requests |
| Throughput | > 20 req/sec | Based on server resources |

### Custom Load Test

```javascript
// Running with custom parameters
import { runLoadTest } from './tests/loadTest.js';

// Modify test configuration
const NUM_CONCURRENT_USERS = 50;      // More users
const PRODUCTS_PER_USER = 10;         // More products each

const result = await runLoadTest();
console.log('Test passed:', result.success);
```

---

## Performance Monitoring

### Enable Performance Tracking

Add the monitoring middleware to your Express server:

```javascript
// server.js
import { performanceMonitoringMiddleware } from './middleware/performanceMonitoring.js';

app.use(performanceMonitoringMiddleware);
```

### Access Performance Metrics

```javascript
import { getPerformanceSummary } from './middleware/performanceMonitoring.js';

// Get current performance stats
const stats = getPerformanceSummary();
console.log(stats);

// Output:
// {
//   totalRequests: 1250,
//   averageResponseTime: '142.35',
//   minResponseTime: '12.04',
//   maxResponseTime: '1823.45',
//   p95ResponseTime: '345.67',
//   p99ResponseTime: '890.23',
//   slowOperationCount: 5,
//   slowOperationThreshold: '1000ms',
//   recentRequests: [...],
//   slowestRequests: [...]
// }
```

### Performance Alerts

Slow operations (> 1000ms) are automatically logged:

```
⚠️  SLOW OPERATION DETECTED:
   Path: /api/products/add
   Time: 1245.67ms
   Memory: +3.45MB
   Queries: 5
```

---

## Database Optimization

### Create Indexes

Run index creation at server startup:

```javascript
// server.js
import { createProductIndexes } from './utils/databaseOptimization.js';

// On startup
await createProductIndexes();
```

### Available Indexes

| Index | Fields | Purpose |
|-------|--------|---------|
| `idx_itemcode` | itemcode | Fast code lookups |
| `idx_barcode` | barcode | Fast barcode lookups |
| `idx_name` | name | Product name search |
| `idx_isDeleted` | isDeleted | Filter active products |
| `idx_notDeletedItemcode` | isDeleted, itemcode | Combined lookup |
| `idx_categoryNotDeleted` | categoryId, isDeleted | Category filtering |
| `idx_notDeletedCreated` | isDeleted, createdAt | Pagination sorting |
| `idx_fulltext` | name, vendor, itemcode (TEXT) | Full-text search |

### Index Analysis

```javascript
import { analyzeIndexUsage } from './utils/databaseOptimization.js';

const analysis = await analyzeIndexUsage();
```

### Validate Database Consistency

```javascript
import { validateDatabaseConsistency } from './utils/databaseOptimization.js';

const result = await validateDatabaseConsistency();
// Returns:
// {
//   summary: {
//     duplicateItemcodes: 0,
//     duplicateBarcodes: 0,
//     brokenCategoryRefs: 0,
//     totalCounters: 1
//   }
// }
```

### Run Maintenance

```javascript
import { runDatabaseMaintenance } from './utils/databaseOptimization.js';

await runDatabaseMaintenance();
// • Deletes old test data
// • Rebalances indexes
// • Optimizes storage
```

---

## Validation Enhancements

### Client-Side Validation

The new `ProductValidator` provides comprehensive field validation:

```javascript
import { ProductValidator } from '@/utils/productValidator';

const validator = new ProductValidator();
const result = validator.validateProduct(formData);

if (!result.isValid) {
  console.log('Errors:', result.errors);
  console.log('Warnings:', result.warnings);
  // {
  //   field: 'barcode',
  //   message: 'Barcode is required',
  //   type: 'error'
  // }
}
```

### Validation Rules

| Field | Rule | Example |
|-------|------|---------|
| barcode | 5-14 chars, alphanumeric | BC123456789012 |
| itemcode | 3-50 chars, alphanumeric | AUTO001 |
| name | 3-255 chars, with letters | Product Name |
| vendor | 2-100 chars | ABC Supplies |
| stock | Non-negative integer | 500 |
| cost | Positive decimal | 100.50 |
| price | Positive decimal, >= cost | 200.00 |

### Validation Feedback

```javascript
import { useValidationFeedback } from '@/hooks/useFormEnhancements';

const {
  getFieldError,      // Get error message for field
  getFieldWarning,    // Get warning message for field
  hasError,           // Check if field has error
  hasWarning,         // Check if field has warning
  isValid             // Check if all validation passed
} = useValidationFeedback(formData);

// In JSX
{hasError('barcode') && (
  <span style={{ color: 'red' }}>
    {getFieldError('barcode')}
  </span>
)}

{hasWarning('price') && (
  <span style={{ color: 'orange' }}>
    {getFieldWarning('price')}
  </span>
)}
```

---

## Client-Side Caching

### IndexedDB Caching System

Reduces API calls by 80%+ for frequently accessed data:

```javascript
import {
  cacheProducts,
  getCachedProducts,
  cacheCategories,
  getCachedCategories
} from '@/utils/dbCache';

// Cache products after fetching from server
const products = await productAPI.fetchProducts();
await cacheProducts(products);

// Later, check cache first
const cachedProducts = await getCachedProducts();
if (cachedProducts) {
  setProducts(cachedProducts);  // Use cached instantly
  // Then refresh from server in background
  fetchProductsInBackground();
}
```

### Cache Status

```javascript
import { getCacheStats } from '@/utils/dbCache';

const stats = await getCacheStats();
// {
//   products: 5432,
//   categories: 245,
//   unitTypes: 50,
//   syncQueue: 2,
//   metadata: {
//     products: { timestamp, age, expired },
//     categories: { ... }
//   }
// }
```

### Cache Expiry

Default cache validity: **30 minutes**

Modify in [dbCache.js](../client/src/utils/dbCache.js):
```javascript
const CACHE_EXPIRY = 30 * 60 * 1000; // milliseconds
```

### Offline Sync Queue

For offline product creation:

```javascript
import { addToSyncQueue, getSyncQueue } from '@/utils/dbCache';

// When offline, queue the product
await addToSyncQueue('CREATE_PRODUCT', {
  name: 'New Product',
  barcode: '123456789',
  // ... other fields
});

// When back online, process queue
const queue = await getSyncQueue();
for (const item of queue) {
  await productAPI.saveProduct(item.data);
}
```

---

## UI/UX Enhancements

### Form Progress Tracking

Show users how much of the form they've completed:

```javascript
import { useFormProgress } from '@/hooks/useFormEnhancements';

const progress = useFormProgress(formData, [
  'barcode',
  'name',
  'vendor',
  'cost',
  'price',
  'stock',
  'unitType'
]);

// Display progress bar
<ProgressBar value={progress} max={100} />
<span>{progress}% Complete</span>
```

### Auto-Save Draft

Auto-save form data so users don't lose work:

```javascript
import { useAutoSave } from '@/hooks/useFormEnhancements';

const { hasDraft, loadDraft, clearDraft, lastSaved } = useAutoSave(
  formData,
  'product_form_draft'
);

// Show "Last saved at 10:32 AM"
{lastSaved && <span>Last saved: {lastSaved.toLocaleTimeString()}</span>}

// Restore draft on page load
useEffect(() => {
  if (hasDraft) {
    const draft = loadDraft();
    setFormData(draft);
  }
}, []);
```

### Request Deduplication

Prevent duplicate submissions on double-click:

```javascript
import { useRequestDedup } from '@/hooks/useFormEnhancements';

const { makeRequest, hasPendingRequest } = useRequestDedup();

const handleSave = async () => {
  try {
    await makeRequest('save-product', () =>
      productAPI.saveProduct(formData)
    );
  } catch (error) {
    toast.error('Failed to save product');
  }
};

// Disable button while request pending
<button disabled={hasPendingRequest('save-product')}>
  {hasPendingRequest('save-product') ? 'Saving...' : 'Save'}
</button>
```

### Bulk Operations

Handle multiple product operations efficiently:

```javascript
import { useBulkOperation } from '@/hooks/useFormEnhancements';

const {
  isBulkProcessing,
  bulkProgress,
  bulkResults,
  processBatch
} = useBulkOperation();

const handleBulkImport = async (products) => {
  const results = await processBatch(products, async (product) => {
    return productAPI.saveProduct(product);
  }, 10); // 10 products per batch

  console.log(`Created: ${results.successful.length}`);
  console.log(`Failed: ${results.failed.length}`);
};

// Show progress
<ProgressBar value={bulkProgress} max={100} />
<span>{bulkProgress}% processed</span>
```

---

## Testing Checklist

### Per-Release Testing

- [ ] Run load test with 10 concurrent users
- [ ] Verify zero duplicate item codes
- [ ] Check average response time < 200ms
- [ ] Verify database consistency
- [ ] Test index usage
- [ ] Clear and recreate indexes
- [ ] Run maintenance routine

### Functionality Testing

- [ ] Create product with auto-generated item code
- [ ] Create product with custom item code
- [ ] Edit product and change item code
- [ ] Edit product and keep same item code
- [ ] Validate all required fields
- [ ] Test bar code uniqueness
- [ ] Test item code uniqueness
- [ ] Test pricing validation (price >= cost)

### Performance Testing

- [ ] Load time with 50k products
- [ ] Search performance with full-text index
- [ ] Sort/filter operations
- [ ] Pagination (50 products per page)
- [ ] Bulk import (100+ products)

### Cache Testing

- [ ] Cache products after fetch
- [ ] Load from cache on second visit
- [ ] Cache expiration after 30 min
- [ ] Clear cache and reload
- [ ] Offline sync queue

### Multi-User Testing

- [ ] Two users creating simultaneously
- [ ] Multiple users editing same product
- [ ] Item codes FIFO fairness
- [ ] No code conflicts

### Browser Testing

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (macOS)
- [ ] Edge (latest)
- [ ] Mobile (iOS Safari, Chrome Mobile)

---

## Performance Baseline

### Before Optimization

```
Load Test: 10 concurrent users, 5 products each
├─ Success Rate: 100%
├─ Avg Response: 312ms
├─ P95 Response: 850ms
├─ Throughput: 15 req/sec
└─ Cache: None
```

### After Optimization (Expected)

```
Load Test: 10 concurrent users, 5 products each
├─ Success Rate: 100%
├─ Avg Response: 125ms ⬇️ 60%
├─ P95 Response: 275ms ⬇️ 68%
├─ Throughput: 45 req/sec ⬆️ 200%
├─ Cache Hit Rate: ~80%
└─ Search Speed: 10ms (vs 500ms from DB)
```

---

## Troubleshooting

### Load Test Failures

**Problem**: Some products not created
```
✗ Failed: 5
```

**Solutions**:
1. Check server logs for errors
2. Verify database connection
3. Check Counter collection exists
4. Verify unique indexes not violated

### Slow Response Times

**Symptoms**: Average > 300ms

**Solutions**:
1. Check database indexes are created
2. Analyze slow query logs
3. Monitor CPU/Memory on server
4. Check network latency

### Duplicate Item Codes

**Problem**: ❌ DUPLICATE CHECK: FAILED - Found 2 duplicate item codes

**Solutions**:
1. Check Counter collection atomicity
2. Run `validateDatabaseConsistency()`
3. Manually fix duplicates
4. Recreate sequence counter

### Cache Issues

**Problem**: Stale data displayed

**Solutions**:
1. Check cache expiry time
2. Clear cache: `clearAllCaches()`
3. Verify cache metadata
4. Check localStorage quota

---

## Next Steps

1. **Run full load test** before releasing to production
2. **Monitor performance metrics** in production
3. **Implement alerting** for slow operations
4. **Scale testing** for 100k+ products
5. **Add automated testing** in CI/CD pipeline

---

## Resources

- [Load Test Source](../server/tests/loadTest.js)
- [Performance Monitoring](../server/middleware/performanceMonitoring.js)
- [Database Optimization](../server/utils/databaseOptimization.js)
- [Product Validator](../client/src/utils/productValidator.js)
- [Form Enhancements](../client/src/hooks/useFormEnhancements.js)
- [Cache System](../client/src/utils/dbCache.js)
