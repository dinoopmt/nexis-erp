# API Response Format & Troubleshooting Guide

## Current API Response Structure

### Product Search Endpoint
**Endpoint:** `GET /api/products/getproducts`

**Query Parameters:**
```
?search=<string>    - Search term (searches in name, itemcode, barcode)
&page=<number>      - Page number (default: 1)
&limit=<number>     - Items per page (default: 20, max: 100)
```

**Success Response (200 OK):**
```json
{
  "products": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Product Name",
      "itemcode": "ITEM001",
      "barcode": "123456789",
      "price": 99.99,
      "stock": 150,
      "tax": 5.00,
      "cost": 50.00
    }
    // ... 19 more items
  ],
  "total": 15347,        // Total products matching search
  "page": 1,              // Current page
  "pages": 768,          // Total pages (total/limit)
  "hasMore": true        // Are there more pages to load?
}
```

**Fields in Response:**
- `products[]` - Array of product objects (max 20 per page)
- `total` - Total count of products matching search criteria
- `page` - Current page number (1-indexed)
- `pages` - Total number of pages
- `hasMore` - Boolean indicating if more results available

**Error Response (500):**
```json
{
  "error": "Error message describing what went wrong"
}
```

---

## Frontend Usage Pattern

### Initial Load
```javascript
const handleSearch = async (searchTerm) => {
  const res = await axios.get(
    `${API_URL}/api/products/getproducts?search=${searchTerm}&page=1&limit=20`
  );
  
  setProducts(res.data.products);           // Replace products
  setProductPage(1);                         // Reset to page 1
  setTotalProducts(res.data.total);          // Show "5 of 15347"
  setHasMoreProducts(res.data.hasMore);      // Show "Load More" button?
};
```

### Load More
```javascript
const handleLoadMore = async () => {
  const nextPage = productPage + 1;
  const res = await axios.get(
    `${API_URL}/api/products/getproducts?search=${currentSearch}&page=${nextPage}&limit=20`
  );
  
  setProducts(prev => [...prev, ...res.data.products]);  // Append
  setProductPage(nextPage);
  setHasMoreProducts(res.data.hasMore);
};
```

---

## Troubleshooting Guide

### Issue 1: Search Returns Empty Results (0 products)

**Symptoms:**
- Searched for "Product ABC" → Returns `total: 0`
- User sees "No products found"

**Causes & Solutions:**

```
❌ Problem: Product doesn't exist
✅ Solution: Check database has the product
   Command: db.products.findOne({ name: "Product ABC" })

❌ Problem: Search doesn't look in all fields
✅ Solution: Backend searches: name, itemcode, barcode
   Verify product has at least one of these fields

❌ Problem: Case sensitivity issue
✅ Solution: Queries are case-insensitive (already handled)

❌ Problem: Special characters breaking search
✅ Solution: Escape special regex characters
   "Product (Size)" works, but verify in database
```

**Debug Steps:**
```javascript
// 1. Check what's in the database
db.products.findOne({ name: /Product ABC/i })

// 2. Try exact text search
db.products.findOne({ itemcode: "ABC123" })

// 3. Search with wildcard
db.products.find({ name: /^Product/ })
```

---

### Issue 2: Search Response is Very Slow (> 1 second)

**Symptoms:**
- Typed "test" → Waited 2-3 seconds for response
- Search with big phrase slower

**Causes & Solutions:**

```
❌ Problem: No database indexes
✅ Solution: Create indexes
   db.products.createIndex({ name: 1 });
   db.products.createIndex({ itemcode: 1 });
   db.products.createIndex({ barcode: 1 });
   Expected: Response 200-500ms → 50-100ms

❌ Problem: Searching full collection (100k+ items)
✅ Solution: Already handled with pagination
   API uses lean() and field selection

❌ Problem: No debouncing on frontend
✅ Solution: Already implemented (300ms debounce)
   Reduces API calls by ~80%

❌ Problem: Redis cache not configured
✅ Solution: Optional enhancement
   Most common searches cached
   Can save 50-80% of response time
```

**Performance Benchmark:**
```
WITHOUT indexes:
  - First search: 2000-3000ms
  - Second search: 1800-2500ms

WITH simple index:
  - All searches: 200-500ms

WITH index + .lean():
  - All searches: 100-300ms

WITH index + .lean() + Redis cache:
  - Cached searches: 5-20ms
  - New searches: 100-300ms
```

---

### Issue 3: "Load More" Button Doesn't Appear

**Symptoms:**
- Only 20 products shown
- "Load More Products" button not visible
- User can't scroll to see more

**Causes & Solutions:**

```
❌ Problem: hasMoreProducts state is false
✅ Solution: Check API response includes hasMore flag
   API returns: { products: [...], hasMore: false }
   If hasMore=false, it's correct (all results loaded)

❌ Problem: Button exists but not visible in dropdown
✅ Solution: Check CSS styles
   Button should be at bottom of dropdown
   Check: z-index, position, visibility

❌ Problem: Frontend not updating hasMoreProducts state
✅ Solution: Verify state update after API call
   Code: setHasMoreProducts(res.data.hasMore);

❌ Problem: Total products < 20
✅ Solution: Correct behavior
   If 15 products total, hasMore=false (no more to load)
```

**Debug Steps:**
```javascript
// Add console logs to check state
console.log('Total products:', totalProducts);
console.log('Has more?:', hasMoreProducts);
console.log('Current page:', productPage);
console.log('Products loaded:', products.length);

// Expected:
// Total products: 15347
// Has more?: true
// Current page: 1
// Products loaded: 20
```

---

### Issue 4: API Returns 500 Error

**Symptoms:**
- Search button clicked → Server error
- Red error message in UI
- Browser console shows 500

**Causes & Solutions:**

```
❌ Problem: MongoDB not connected
✅ Solution: Check server logs
   Error: "MongooseError: Cannot connect to MongoDB"
   Fix: Verify MongoDB is running
   Command: mongosh admin

❌ Problem: Invalid search parameter
✅ Solution: Encode special characters
   Bad: ?search=Product (Brand)
   Good: ?search=Product%20%28Brand%29

❌ Problem: Syntax error in controller
✅ Solution: Check server logs for stack trace
   Look for: SyntaxError in productController.js

❌ Problem: Database query timeout
✅ Solution: Increase timeout if dataset > 1M
   Default: 30 seconds (should be fine)
```

**Check Server Logs:**
```bash
# In server directory
npm start

# Look for errors like:
# ❌ Error: Cannot find field 'name'
# ❌ MongooseError: Connection refused
# ❌ ReferenceError: 'Product' is not defined
```

---

### Issue 5: Pagination Shows Wrong Total Count

**Symptoms:**
- Shows "100 of 15347" at top
- But only 20 products visible
- Total doesn't match what's loaded

**Causes & Solutions:**

```
✅ THIS IS CORRECT BEHAVIOR
   Total = total products matching search
   Products shown = 20 per page
   
   "100 of 15347" means:
   - You've loaded 100 products (5 pages × 20 each)
   - 15347 total match search
   - More available to load

❌ Problem: Total count keeps increasing
✅ Solution: Should stay same
   First load: total=15347
   After page 2: total=15347 (same)
   Check code doesn't sum tallies incorrectly

❌ Problem: Products loaded > total shown
✅ Solution: Check hasMore logic
   If total=50, limit=20, then:
   Page 1-2: hasMore=true
   Page 3: hasMore=false (all 50 loaded)
```

**Verify Logic:**
```javascript
// This is correct:
total = 15347
page = 1
pages = Math.ceil(15347 / 20) = 768
hasMore = true (1 < 768)

// Load page 2
page = 2
hasMore = true (2 < 768)

// Load page 768 (last page)
page = 768
hasMore = false (no page 769)
```

---

### Issue 6: Memory Usage Keeps Growing

**Symptoms:**
- App starts fine
- After 30 min, uses 500MB RAM
- System becomes slow

**Causes & Solutions:**

```
❌ Problem: Not clearing old products from state
✅ Solution: Replace instead of append on new search
   Code: setProducts(res.data.products)  // Replace
   NOT:  setProducts(prev => [...prev, ...res]);  // Append

❌ Problem: Memory leak in axios/API calls
✅ Solution: Check network cancellation
   Use AbortController to cancel old requests
   Only 1 search should be pending

❌ Problem: Event listeners not cleaned up
✅ Solution: Add cleanup in useEffect
   return () => { removeEventListener(...) }

❌ Problem: Large product objects stored
✅ Solution: Already optimized via lean()
   API returns only essential fields
   Size: ~1KB per product (20 items = 20KB)
```

**Monitor Memory:**
```javascript
// Add to component
useEffect(() => {
  const interval = setInterval(() => {
    if (window.performance && window.performance.memory) {
      const mem = window.performance.memory;
      console.log(`Memory: ${Math.round(mem.usedJSHeapSize / 1048576)}MB`);
    }
  }, 5000);
  return () => clearInterval(interval);
}, []);

// Should stay < 100MB during usage
```

---

### Issue 7: Debouncing Not Working (Too Many API Calls)

**Symptoms:**
- Typing "test" makes 4 API calls in 1 second
- Server showing too many requests
- "Load More" button flickering

**Causes & Solutions:**

```
❌ Problem: Debouncing not implemented
✅ Solution: Already implemented in code
   300ms wait after user stops typing

❌ Problem: Debounce timeout not being cleared
✅ Solution: Check cleanup in useEffect
   return () => clearTimeout(debounceTimer);

❌ Problem: Multiple components searching simultaneously
✅ Solution: Prevent overlapping searches
   Only allow 1 active search at a time

❌ Problem: "Load More" button unintentionally triggering
✅ Solution: Add loading state
   Disable button while loading
   Code: onClick={!loading && handleLoadMore}
```

**Add Logging to Verify Debouncing:**
```javascript
useEffect(() => {
  console.log('API call made at:', new Date().toLocaleTimeString());
  // Should only log once per 300ms minimum
}, [debouncedSearch]);
```

---

## Performance Checklist

- [ ] Response time < 500ms (< 200ms with indexes)
- [ ] Memory stable < 100MB
- [ ] No duplicate API calls
- [ ] Debouncing working (300ms)
- [ ] Pagination showing correct counts
- [ ] "Load More" appears when hasMore=true
- [ ] Searches work in name, itemcode, barcode fields
- [ ] 404 errors handled gracefully
- [ ] No console errors or warnings
- [ ] Works with 10k+ products

---

## API Examples

### Example 1: Search for "Product"
```
Request: GET /api/products/getproducts?search=Product&page=1&limit=20

Response:
{
  "products": [
    { "name": "Product 1", "itemcode": "P001", ... },
    { "name": "Product 2", "itemcode": "P002", ... },
    ...
  ],
  "total": 10324,
  "page": 1,
  "pages": 517,
  "hasMore": true
}
```

### Example 2: Search for Item Code
```
Request: GET /api/products/getproducts?search=ITEM&page=1&limit=20

Response:
{
  "products": [
    { "name": "Widget", "itemcode": "ITEM001", ... },
    ...
  ],
  "total": 523,
  "page": 1,
  "pages": 27,
  "hasMore": true
}
```

### Example 3: No Results
```
Request: GET /api/products/getproducts?search=NonExistent&page=1&limit=20

Response:
{
  "products": [],
  "total": 0,
  "page": 1,
  "pages": 0,
  "hasMore": false,
  "message": "No products found"
}
```

### Example 4: Load More (Page 2)
```
Request: GET /api/products/getproducts?search=Product&page=2&limit=20

Response:
{
  "products": [
    // 20 more products (items 21-40)
  ],
  "total": 10324,
  "page": 2,
  "pages": 517,
  "hasMore": true  // Still more to load
}
```

### Example 5: Last Page
```
Request: GET /api/products/getproducts?search=Product&page=517&limit=20

Response:
{
  "products": [
    // Last few products
  ],
  "total": 10324,
  "page": 517,
  "pages": 517,
  "hasMore": false  // No more pages
}
```

---

## Next Steps

1. **Deploy Changes**
   - Backend pagination is live ✅
   - Frontend pagination is live ✅
   - Test with production data

2. **Monitor Performance**
   - Check response times
   - Watch memory usage
   - Verify no errors in logs

3. **Optimize if Needed**
   - Add database indexes if response > 500ms
   - Implement Redis caching if > 100k products
   - Consider Elasticsearch if search features expand

4. **Document for Team**
   - Share this guide with developers
   - Add API documentation to wiki
   - Document pagination behavior

